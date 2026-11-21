import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import sharp, { type Sharp } from "sharp";
import { z } from "zod/v4";
import { anthropic, EXTRACTION_MODEL } from "./extract";
import { downloadImage, fetchPage, meta } from "./fetch-source";
import { cropRect, isUnhelpfulSite, linksInText, pagePicture, publicHttpsUrl, UNHELPFUL_SITES } from "./picture-parse";
import { readImage, saveImage } from "./storage";

// "Find a better picture": for recipes whose picture is a cookbook page or screenshot.
// 1. Cut the photo of the dish out of the recipe's own photos, when the page has one.
// 2. Search the web for pages with this dish and offer their food photos.

const STORED_EDGE = 1600; // cover pictures don't need to be bigger than this

/** Shrinks a picture to a sensible size for a cover and stores it. */
async function storeCover(image: Sharp): Promise<string> {
  const data = await image
    .resize(STORED_EDGE, STORED_EDGE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84 })
    .toBuffer();
  return saveImage(data, "image/jpeg");
}

// ---------- 1. Crop the dish photo out of the recipe's own photos ----------

const DishPhotos = z.object({
  photos: z
    .array(
      z.object({
        photo: z.number().int().describe("Which photo the dish picture is in, counting from 1"),
        left: z.number().describe("Left edge of the dish picture, in pixels from the left of that photo"),
        top: z.number().describe("Top edge, in pixels from the top"),
        right: z.number().describe("Right edge, in pixels from the left"),
        bottom: z.number().describe("Bottom edge, in pixels from the top"),
      }),
    )
    .describe("One entry per picture of the finished dish; empty if there are none"),
});

const CROP_SYSTEM = `You find pictures of finished food inside photos of recipes (cookbook pages, magazine pages, screenshots of websites or social media posts).

For each picture of the finished dish, give a tight box around just that picture: leave out the recipe text, headings, captions, page margins, the book's edge and the table it sits on.
Skip small step-by-step photos, ingredient shots, icons, adverts and photos of people. If a photo is already just a picture of the food with no recipe text, skip it.
If there are no pictures of the dish, return an empty list.`;

// Sent at a size the AI sees without rescaling (about 1.15 megapixels), so its pixel
// positions line up with the picture we crop.
function sentSize(width: number, height: number) {
  const scale = Math.min(1, 1268 / Math.max(width, height), Math.sqrt(1_150_000 / (width * height)));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Cuts photos of the dish out of the recipe's own photos and stores them. Returns their keys. */
export async function cropDishPhotos(keys: string[], title: string): Promise<string[]> {
  const photos = (
    await Promise.all(
      keys.map(async (key) => {
        const data = await readImage(key);
        if (!data) return null;
        try {
          // Apply the camera's rotation first so the AI and the crop see the same way up.
          const full = await sharp(data).rotate().jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true });
          const seen = sentSize(full.info.width, full.info.height);
          const preview = await sharp(full.data).resize(seen.width, seen.height).jpeg({ quality: 85 }).toBuffer();
          return { full: full.data, fullSize: { width: full.info.width, height: full.info.height }, seen, preview };
        } catch {
          return null;
        }
      }),
    )
  ).filter((p) => p !== null);
  if (!photos.length) return [];

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  photos.forEach((p, i) => {
    content.push({ type: "text", text: `Photo ${i + 1} (${p.seen.width} × ${p.seen.height} pixels):` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: p.preview.toString("base64") } });
  });
  content.push({ type: "text", text: `The recipe is “${title}”. Find the pictures of the finished dish.` });

  const response = await anthropic().beta.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(DishPhotos) },
    system: CROP_SYSTEM,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return [];

  const crops: string[] = [];
  for (const box of response.parsed_output.photos.slice(0, 6)) {
    const photo = photos[box.photo - 1];
    if (!photo) continue;
    const rect = cropRect(box, photo.seen, photo.fullSize);
    if (!rect) continue;
    crops.push(await storeCover(sharp(photo.full).extract(rect)));
  }
  return crops;
}

// ---------- 2. Search the web ----------

export type WebPicture = { imageUrl: string; pageUrl: string; site: string; pageTitle: string };

const SEARCH_SYSTEM = `You help a family find a good photo of a finished dish for a recipe in their meal planner.

Search the web for pages that show this recipe, or the same dish, with a photo of the finished food:
- First, the original author's or publisher's own page for this recipe, when it comes from a cookbook, chef, blog or creator.
- Then other well-known recipe websites with the same dish.
Only pick pages about this one dish, not round-ups of many recipes, shops, video or social media sites.

When you're done, reply with just the links to the best pages, one per line, best first, at most 8. No other text.`;

const MAX_PAGES = 10;

function siteName(url: URL) {
  return url.hostname.replace(/^www\./, "");
}

/** Searches the web for photos of this dish. Best effort: returns what it finds. */
export async function searchWebPictures(recipe: {
  title: string;
  sourceLabel: string;
  description: string;
  sourceUrl: string | null;
}): Promise<WebPicture[]> {
  const prompt = [
    `Recipe: ${recipe.title}`,
    recipe.sourceLabel && `Where it's from: ${recipe.sourceLabel}`,
    recipe.sourceUrl && `Original link: ${recipe.sourceUrl}`,
    recipe.description && `Description: ${recipe.description}`,
  ]
    .filter(Boolean)
    .join("\n");

  const tools: Anthropic.Beta.BetaToolUnion[] = [
    { type: "web_search_20260209", name: "web_search", max_uses: 3, blocked_domains: UNHELPFUL_SITES },
  ];

  // The page links the AI chose (best first), then everything else its searches turned up.
  const chosen: string[] = [];
  const found = new Map<string, string>(); // url -> page title
  let messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  for (let turn = 0; turn < 3; turn++) {
    const response = await anthropic().beta.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SEARCH_SYSTEM,
      tools,
      messages,
    });
    for (const block of response.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (!found.has(r.url)) found.set(r.url, r.title);
      } else if (block.type === "text") {
        chosen.push(...linksInText(block.text));
      }
    }
    // A long search can pause part way; sending the turn back lets it carry on.
    if (response.stop_reason !== "pause_turn") break;
    messages = [
      { role: "user", content: prompt },
      { role: "assistant", content: response.content },
    ];
  }

  const pages: URL[] = [];
  for (const link of [...chosen, ...found.keys()]) {
    const url = publicHttpsUrl(link);
    if (!url || isUnhelpfulSite(url)) continue;
    url.hash = "";
    if (pages.some((p) => p.href === url.href)) continue;
    pages.push(url);
    if (pages.length >= MAX_PAGES) break;
  }

  const results = await Promise.all(
    pages.map(async (url): Promise<WebPicture | null> => {
      try {
        const res = await fetchPage(url, 8_000);
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
        const html = (await res.text()).slice(0, 2_000_000);
        const imageUrl = pagePicture(html, res.url || url.href);
        if (!imageUrl) return null;
        const title = found.get(url.href) ?? meta(html, "og:title") ?? siteName(url);
        return { imageUrl, pageUrl: url.href, site: siteName(url), pageTitle: title };
      } catch {
        return null;
      }
    }),
  );

  const seen = new Set<string>();
  return results.filter((r): r is WebPicture => {
    if (!r || seen.has(r.imageUrl)) return false;
    seen.add(r.imageUrl);
    return true;
  });
}

/** Downloads a picture found on the web and stores it as a cover option. */
export async function saveWebPicture(imageUrl: string): Promise<string | null> {
  const url = publicHttpsUrl(imageUrl);
  if (!url) return null;
  const image = await downloadImage(url.href);
  if (!image) return null;
  try {
    return await storeCover(sharp(image.data).rotate());
  } catch {
    return null;
  }
}
