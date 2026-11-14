import "server-only";

// Fetches a recipe link and boils it down to something small for the AI to read:
// schema.org Recipe JSON-LD when the site has it, otherwise the page's readable text.

export type FetchedSource =
  | { ok: true; kind: "web" | "instagram"; text: string; imageUrl: string | null; siteName: string }
  | { ok: false; kind: "web" | "instagram"; reason: string };

const MAX_TEXT = 40_000;

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function meta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i",
  );
  const m = html.match(re);
  const v = m?.[1] ?? m?.[2];
  return v ? decodeEntities(v) : null;
}

function findRecipeJsonLd(html: string): unknown | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      const stack: unknown[] = [data];
      while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) stack.push(...node);
        else if (node && typeof node === "object") {
          const obj = node as Record<string, unknown>;
          const type = obj["@type"];
          if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
          if (obj["@graph"]) stack.push(obj["@graph"]);
        }
      }
    } catch {
      // ignore malformed blocks
    }
  }
  return null;
}

function jsonLdImage(recipe: Record<string, unknown>): string | null {
  const img = recipe.image;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) {
    const first = img[0];
    return typeof first === "string" ? first : ((first as { url?: string })?.url ?? null);
  }
  return (img as { url?: string } | undefined)?.url ?? null;
}

function readableText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/li|\/h\d|\/div|\/tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, MAX_TEXT);
}

export function isInstagram(url: URL) {
  return /(^|\.)instagram\.com$/i.test(url.hostname);
}

export async function fetchSource(rawUrl: string): Promise<FetchedSource> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return { ok: false, kind: "web", reason: "That doesn't look like a web link." };
  }
  const kind = isInstagram(url) ? "instagram" : "web";

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-AU,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, kind, reason: `The site answered with an error (${res.status}).` };
    html = (await res.text()).slice(0, 2_000_000);
  } catch {
    return { ok: false, kind, reason: "Couldn't reach that link." };
  }

  const siteName = meta(html, "og:site_name") ?? url.hostname.replace(/^www\./, "");

  if (kind === "instagram") {
    // Logged-out Instagram pages sometimes include the caption in og:description.
    const caption = meta(html, "og:description") ?? meta(html, "description");
    const title = meta(html, "og:title") ?? "";
    if (!caption || caption.length < 80) {
      return {
        ok: false,
        kind,
        reason: "Instagram didn't share the caption.",
      };
    }
    return {
      ok: true,
      kind,
      text: `Instagram post: ${title}\n\nCaption:\n${caption}`,
      imageUrl: meta(html, "og:image"),
      siteName: "Instagram",
    };
  }

  const recipe = findRecipeJsonLd(html) as Record<string, unknown> | null;
  if (recipe) {
    return {
      ok: true,
      kind,
      text: `Structured recipe data from ${siteName}:\n${JSON.stringify(recipe).slice(0, MAX_TEXT)}`,
      imageUrl: jsonLdImage(recipe) ?? meta(html, "og:image"),
      siteName,
    };
  }
  const text = readableText(html);
  if (text.length < 200) {
    return { ok: false, kind, reason: "That page didn't have a readable recipe on it." };
  }
  return {
    ok: true,
    kind,
    text: `Page text from ${siteName} (${url.href}):\n${text}`,
    imageUrl: meta(html, "og:image"),
    siteName,
  };
}

/** Downloads a page's food photo so it can become the cover. Best effort. */
export async function downloadImage(url: string): Promise<{ data: Buffer; type: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(type)) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > 5_000_000) return null;
    return { data, type };
  } catch {
    return null;
  }
}
