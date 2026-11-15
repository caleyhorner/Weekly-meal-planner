import "server-only";
import { extractRecipe, type ExtractInput } from "./extract";
import { downloadImage, fetchSource } from "./fetch-source";
import { saveImage } from "./storage";
import type { RecipeInput } from "./recipe-model";

// Reads one recipe from a link, pasted text and/or photos, and returns a draft.
// Shared by "Add recipe" (reviewed before saving) and bulk import (saved straight away).

export type ImportResult =
  | { ok: true; draft: RecipeInput; warning: string | null }
  | { ok: false; error: string; askForScreenshot: boolean };

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function readRecipe({
  link,
  pasted,
  photos,
}: {
  link: string;
  pasted: string;
  photos: File[];
}): Promise<ImportResult> {
  let sourceType: RecipeInput["sourceType"] = photos.length ? "book" : "text";
  let sourceUrl: string | null = null;
  let siteName = "";
  let coverUrl: string | null = null;
  let linkText: string | null = null;
  let warning: string | null = null;

  if (link) {
    const fetched = await fetchSource(link);
    sourceUrl = link;
    sourceType = fetched.kind;
    if (fetched.ok) {
      linkText = fetched.text;
      siteName = fetched.siteName;
      coverUrl = fetched.imageUrl;
    } else if (!pasted && photos.length === 0) {
      return {
        ok: false,
        error:
          fetched.kind === "instagram"
            ? `${fetched.reason} Take a screenshot of the caption (tap "more" first so it's all showing) and add it below.`
            : `${fetched.reason} Try a screenshot of the recipe, or paste the text.`,
        askForScreenshot: true,
      };
    } else {
      warning = `${fetched.reason} Used your screenshot/text instead.`;
    }
  }

  const images: ExtractInput["images"] = await Promise.all(
    photos.map(async (p) => ({
      data: Buffer.from(await p.arrayBuffer()),
      mediaType: p.type as ExtractInput["images"][number]["mediaType"],
    })),
  );

  let extracted;
  try {
    extracted = await extractRecipe({
      images,
      text: [linkText, pasted && `Pasted by the user:\n${pasted}`].filter(Boolean).join("\n\n") || null,
    });
  } catch (err) {
    console.error("Recipe extraction failed", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Couldn't read that recipe.",
      askForScreenshot: false,
    };
  }

  if (!extracted.found_recipe) {
    return {
      ok: false,
      error:
        extracted.problem ??
        "I couldn't find a recipe in that. For Instagram, screenshot the caption with the ingredients.",
      askForScreenshot: sourceType === "instagram",
    };
  }

  // Keep the originals for "View original", and the site's food photo as a cover option.
  const sourceImages = await Promise.all(images.map((img) => saveImage(img.data, img.mediaType)));
  let heroImage: string | null = null;
  if (coverUrl) {
    const cover = await downloadImage(coverUrl);
    if (cover) heroImage = await saveImage(cover.data, cover.type);
  }

  const draft: RecipeInput = {
    title: extracted.title,
    kind: extracted.kind,
    description: extracted.description,
    servings: extracted.servings ?? 0, // 0 makes the review screen ask for it
    prepMinutes: extracted.prep_minutes,
    cookMinutes: extracted.cook_minutes,
    tags: extracted.tags.map((t) => t.toLowerCase().replace(/^#/, "")),
    notes: extracted.notes,
    steps: extracted.steps,
    ingredients: extracted.ingredients.map((i) => ({
      group: i.group,
      raw: i.raw,
      item: i.item.toLowerCase(),
      amount: i.amount && i.amount > 0 ? i.amount : null,
      unit: i.unit,
      prep: i.prep,
      category: i.category,
    })),
    sourceType,
    sourceLabel: extracted.source_label || siteName,
    sourceUrl,
    sourceImages,
    // Start with a picture: the website's food photo, else the first photo it came from.
    heroImage: heroImage ?? sourceImages[0] ?? null,
  };
  return { ok: true, draft, warning: warning ?? (extracted.problem || null) };
}
