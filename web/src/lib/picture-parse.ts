// Pure helpers for "Find a better picture": choosing a page's food photo, reading links,
// and turning the AI's box around a dish photo into a crop. No network here, so it's easy to test.

import { findRecipeJsonLd, jsonLdImage, meta } from "./fetch-source";

/** Sites whose pages don't give a usable food photo (video, social, pin boards). */
export const UNHELPFUL_SITES = ["pinterest.com", "youtube.com", "instagram.com", "facebook.com", "tiktok.com"];

/** A link we're willing to fetch: https on a public-looking host name (no IPs or local names). */
export function publicHttpsUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return null;
  if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) return null;
  return url;
}

export function isUnhelpfulSite(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return UNHELPFUL_SITES.some((s) => host === s || host.endsWith(`.${s}`));
}

/** https links in a block of text, in order, without duplicates. */
export function linksInText(text: string): string[] {
  const found = text.match(/https:\/\/[^\s<>()"'\]]+/g) ?? [];
  return [...new Set(found.map((l) => l.replace(/[.,;:!?*]+$/, "")))];
}

/** The main food photo on a recipe page: the recipe's own picture, else the page's share image. */
export function pagePicture(html: string, pageUrl: string): string | null {
  const recipe = findRecipeJsonLd(html) as Record<string, unknown> | null;
  const candidates = [
    recipe && jsonLdImage(recipe),
    meta(html, "og:image:secure_url"),
    meta(html, "og:image"),
    meta(html, "twitter:image"),
  ];
  for (const c of candidates) {
    if (!c) continue;
    let url: URL;
    try {
      url = new URL(c, pageUrl);
    } catch {
      continue;
    }
    if (url.protocol === "http:") url.protocol = "https:";
    if (!publicHttpsUrl(url.href)) continue;
    // Site logos and placeholder graphics make poor recipe pictures.
    if (/logo|placeholder|default[-_]?(image|share)|\.svg$|\.gif$/i.test(url.pathname)) continue;
    return url.href;
  }
  return null;
}

export type Box = { left: number; top: number; right: number; bottom: number };
export type Size = { width: number; height: number };

/**
 * Turns a box the AI drew on the picture it was shown (`seen`) into a crop of the full-size
 * picture (`full`). Returns null for boxes that are too small, or that cover nearly the
 * whole picture (it's already a photo of the dish, so cropping adds nothing).
 */
export function cropRect(box: Box, seen: Size, full: Size) {
  const sx = full.width / seen.width;
  const sy = full.height / seen.height;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  const left = Math.round(clamp(Math.min(box.left, box.right) * sx, full.width));
  const right = Math.round(clamp(Math.max(box.left, box.right) * sx, full.width));
  const top = Math.round(clamp(Math.min(box.top, box.bottom) * sy, full.height));
  const bottom = Math.round(clamp(Math.max(box.top, box.bottom) * sy, full.height));
  const width = right - left;
  const height = bottom - top;
  if (width < 160 || height < 160) return null;
  if (width < full.width * 0.15 || height < full.height * 0.1) return null;
  if (width * height > full.width * full.height * 0.9) return null;
  return { left, top, width, height };
}
