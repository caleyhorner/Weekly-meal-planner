// Pure parsing for the recipe feed: website feeds (RSS/Atom), sitemaps and recipe pages.
// No network or database here, so it's easy to test.

import { decodeEntities, findRecipeJsonLd, jsonLdImage, meta } from "../fetch-source";

export type FoundLink = { url: string; publishedAt: Date | null };

function dateOrNull(s: string | undefined | null): Date | null {
  if (!s) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim();

/** Links (and dates) from an RSS or Atom feed. */
export function parseFeed(xml: string): FoundLink[] {
  const out: FoundLink[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const link = tag(m[0], "link");
    if (link) out.push({ url: decodeEntities(link), publishedAt: dateOrNull(tag(m[0], "pubDate")) });
  }
  for (const m of xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)) {
    const href =
      m[0].match(/<link[^>]+rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
      m[0].match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    if (href) {
      out.push({
        url: decodeEntities(href),
        publishedAt: dateOrNull(tag(m[0], "published") ?? tag(m[0], "updated")),
      });
    }
  }
  return out;
}

/** A sitemap is either a list of pages or an index of more sitemaps. */
export function parseSitemap(xml: string): { pages: FoundLink[]; sitemaps: string[] } {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const entries = [...xml.matchAll(/<(url|sitemap)>([\s\S]*?)<\/\1>/gi)].map((m) => ({
    loc: tag(m[2], "loc"),
    lastmod: tag(m[2], "lastmod"),
  }));
  if (isIndex) return { pages: [], sitemaps: entries.map((e) => e.loc).filter((l): l is string => !!l).map(decodeEntities) };
  return {
    pages: entries
      .filter((e) => e.loc)
      .map((e) => ({ url: decodeEntities(e.loc!), publishedAt: dateOrNull(e.lastmod) })),
    sitemaps: [],
  };
}

/** Feed link advertised in a page's <head>, if any. */
export function feedLinkFromHtml(html: string, pageUrl: string): string | null {
  const m =
    html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/(?:rss|atom)\+xml["']/i);
  if (!m) return null;
  try {
    return new URL(decodeEntities(m[1]), pageUrl).href;
  } catch {
    return null;
  }
}

/** ISO 8601 duration ("PT1H15M") to minutes. */
export function isoMinutes(d: unknown): number | null {
  if (typeof d !== "string") return null;
  const m = d.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const mins = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return mins > 0 ? mins : null;
}

function strings(v: unknown): string[] {
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap(strings);
  return [];
}

export type ParsedRecipePage = {
  title: string;
  imageUrl: string | null;
  ingredients: string[];
  keywords: string[];
  totalMinutes: number | null;
  publishedAt: Date | null;
};

/** The recipe on a web page (schema.org JSON-LD), or null if the page isn't a recipe. */
export function recipeFromHtml(html: string): ParsedRecipePage | null {
  const r = findRecipeJsonLd(html) as Record<string, unknown> | null;
  if (!r) return null;
  const rawIngredients = Array.isArray(r.recipeIngredient)
    ? r.recipeIngredient.filter((x): x is string => typeof x === "string")
    : typeof r.recipeIngredient === "string"
      ? [r.recipeIngredient]
      : [];
  const ingredients = rawIngredients.map((s) => decodeEntities(s).replace(/\s+/g, " ").trim());
  const title = typeof r.name === "string" ? decodeEntities(r.name).trim() : "";
  if (!title || ingredients.length < 2) return null;
  const parts = (isoMinutes(r.prepTime) ?? 0) + (isoMinutes(r.cookTime) ?? 0);
  const total = isoMinutes(r.totalTime) ?? (parts > 0 ? parts : null);
  return {
    title,
    imageUrl: jsonLdImage(r) ?? meta(html, "og:image"),
    ingredients: ingredients.slice(0, 60),
    keywords: [...new Set([...strings(r.keywords), ...strings(r.recipeCategory), ...strings(r.recipeCuisine)].map((k) => k.toLowerCase()))].slice(0, 20),
    totalMinutes: total,
    publishedAt: dateOrNull(typeof r.datePublished === "string" ? r.datePublished : null),
  };
}

/** Pages on a recipe site that look like recipes (skips category, tag and author pages). */
export function looksLikeRecipeUrl(url: string, site: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname.replace(/^www\./, "") !== new URL(site).hostname.replace(/^www\./, "")) return false;
    const path = u.pathname.toLowerCase();
    if (path === "/" || /\/(category|tag|author|page|search|about|contact|shop|collections?|videos?|feed)\b/.test(path)) return false;
    return path.split("/").filter(Boolean).length >= 1;
  } catch {
    return false;
  }
}
