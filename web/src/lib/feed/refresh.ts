import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { meta } from "../fetch-source";
import {
  feedLinkFromHtml,
  looksLikeRecipeUrl,
  parseFeed,
  parseSitemap,
  recipeFromHtml,
  type FoundLink,
} from "./parse";

// Checks the household's recipe websites for new recipes and stores them as suggestions.
// Polite: one site at a time, a few pages at once, and only pages we haven't seen before.

const { feedSources, feedCandidates } = schema;
type Source = typeof feedSources.$inferSelect;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; DinnersMealPlanner/1.0; household recipe reader)",
  Accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml;q=0.9,*/*;q=0.8",
};

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: "follow", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 3_000_000);
  } catch {
    return null;
  }
}

/** Finds a site's feed of new posts and a sitemap of its recipes. */
async function discover(source: Source): Promise<{ feedUrl: string | null; sitemapUrl: string | null }> {
  const site = source.siteUrl.replace(/\/$/, "");
  let feedUrl = source.feedUrl;
  if (!feedUrl) {
    const home = await fetchText(site + "/");
    const advertised = home ? feedLinkFromHtml(home, site + "/") : null;
    for (const candidate of [advertised, `${site}/feed/`, `${site}/rss`, `${site}/recipes/feed/`]) {
      if (!candidate) continue;
      const xml = await fetchText(candidate);
      if (xml && parseFeed(xml).length) {
        feedUrl = candidate;
        break;
      }
    }
  }
  let sitemapUrl = source.sitemapUrl;
  if (!sitemapUrl) {
    const robots = await fetchText(`${site}/robots.txt`);
    const fromRobots = [...(robots ?? "").matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    for (const candidate of [...fromRobots, `${site}/sitemap_index.xml`, `${site}/sitemap.xml`]) {
      const xml = await fetchText(candidate);
      if (xml && /<(urlset|sitemapindex)[\s>]/i.test(xml)) {
        sitemapUrl = candidate;
        break;
      }
    }
  }
  return { feedUrl, sitemapUrl };
}

/** Recent recipe-looking pages from the feed and the sitemap, newest first. */
async function collectLinks(source: Source, feedUrl: string | null, sitemapUrl: string | null): Promise<FoundLink[]> {
  const links: FoundLink[] = [];
  if (feedUrl) {
    const xml = await fetchText(feedUrl);
    if (xml) links.push(...parseFeed(xml).slice(0, 30));
  }
  if (sitemapUrl) {
    const xml = await fetchText(sitemapUrl);
    if (xml) {
      const top = parseSitemap(xml);
      let pages = top.pages;
      if (top.sitemaps.length) {
        // Prefer the recipe sitemaps on big sites; otherwise the post sitemaps.
        const pick = top.sitemaps.filter((s) => /recipe/i.test(s));
        const children = (pick.length ? pick : top.sitemaps.filter((s) => /post/i.test(s))).slice(-2);
        for (const child of children) {
          const childXml = await fetchText(child);
          if (childXml) pages = pages.concat(parseSitemap(childXml).pages);
        }
      }
      pages.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
      links.push(...pages.slice(0, 80));
    }
  }
  const seen = new Set<string>();
  return links.filter((l) => {
    const key = l.url.replace(/[?#].*$/, "");
    if (seen.has(key) || !looksLikeRecipeUrl(l.url, source.siteUrl)) return false;
    seen.add(key);
    return true;
  });
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

export type RefreshResult = { source: string; added: number; error: string | null };

/** Checks one website and stores up to `maxNew` new recipes from it. */
export async function refreshSource(source: Source, maxNew = 15): Promise<RefreshResult> {
  const { feedUrl, sitemapUrl } = await discover(source);
  let error: string | null = null;
  let added = 0;

  if (!feedUrl && !sitemapUrl) {
    error = "Couldn't find a list of new recipes on this site.";
  } else {
    const links = await collectLinks(source, feedUrl, sitemapUrl);
    const known = links.length
      ? await db
          .select({ url: feedCandidates.url })
          .from(feedCandidates)
          .where(inArray(feedCandidates.url, links.map((l) => l.url)))
      : [];
    const knownSet = new Set(known.map((k) => k.url));
    const fresh = links.filter((l) => !knownSet.has(l.url)).slice(0, maxNew);

    await inBatches(fresh, 4, async (link) => {
      const html = await fetchText(link.url);
      const recipe = html ? recipeFromHtml(html) : null;
      // Pages that aren't recipes are remembered as "skipped" so they aren't fetched again.
      await db
        .insert(feedCandidates)
        .values(
          recipe
            ? {
                sourceId: source.id,
                url: link.url,
                title: recipe.title,
                imageUrl: recipe.imageUrl,
                ingredients: recipe.ingredients,
                keywords: recipe.keywords,
                totalMinutes: recipe.totalMinutes,
                publishedAt: recipe.publishedAt ?? link.publishedAt,
              }
            : { sourceId: source.id, url: link.url, title: "", status: "skipped" as const },
        )
        .onConflictDoNothing();
      if (recipe) added++;
    });
    if (links.length === 0) error = "The site's list of recipes was empty or couldn't be read.";
  }

  await db
    .update(feedSources)
    .set({ feedUrl, sitemapUrl, lastCheckedAt: new Date(), lastError: error })
    .where(eq(feedSources.id, source.id));
  return { source: source.name, added, error };
}

/** The daily check: every website, one after another. */
export async function refreshAll(maxNewPerSite = 15): Promise<RefreshResult[]> {
  const sources = await db.select().from(feedSources);
  const results: RefreshResult[] = [];
  for (const s of sources) results.push(await refreshSource(s, maxNewPerSite));
  return results;
}

/** Name for a newly added site, from its own pages. */
export async function siteName(siteUrl: string): Promise<string> {
  const html = await fetchText(siteUrl);
  const name = html ? (meta(html, "og:site_name") ?? html.match(/<title[^>]*>([^<|–-]+)/i)?.[1]) : null;
  return name?.trim() || new URL(siteUrl).hostname.replace(/^www\./, "");
}
