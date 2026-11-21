import { test } from "node:test";
import assert from "node:assert/strict";
import { feedLinkFromHtml, isoMinutes, looksLikeRecipeUrl, parseFeed, parseSitemap, recipeFromHtml } from "./parse";

test("reads RSS and Atom feeds", () => {
  const rss = `<rss><channel><item><title>A</title><link>https://site.com/a-pie/</link><pubDate>Mon, 16 Nov 2026 08:00:00 +0000</pubDate></item>
    <item><link><![CDATA[https://site.com/b-curry/]]></link></item></channel></rss>`;
  const r = parseFeed(rss);
  assert.equal(r.length, 2);
  assert.equal(r[0].url, "https://site.com/a-pie/");
  assert.equal(r[0].publishedAt?.toISOString(), "2026-11-16T08:00:00.000Z");
  assert.equal(r[1].url, "https://site.com/b-curry/");
  const atom = `<feed><entry><link rel="alternate" href="https://site.com/c"/><published>2026-11-10T00:00:00Z</published></entry></feed>`;
  assert.equal(parseFeed(atom)[0].url, "https://site.com/c");
});

test("reads sitemaps and sitemap indexes", () => {
  const index = `<sitemapindex><sitemap><loc>https://site.com/recipe-sitemap.xml</loc></sitemap></sitemapindex>`;
  assert.deepEqual(parseSitemap(index).sitemaps, ["https://site.com/recipe-sitemap.xml"]);
  const pages = parseSitemap(`<urlset><url><loc>https://site.com/x</loc><lastmod>2026-11-01</lastmod></url></urlset>`);
  assert.equal(pages.pages[0].url, "https://site.com/x");
});

test("finds the feed link in a page head", () => {
  const html = `<link rel="alternate" type="application/rss+xml" title="Feed" href="/feed/">`;
  assert.equal(feedLinkFromHtml(html, "https://www.site.com/"), "https://www.site.com/feed/");
});

test("reads a recipe page's JSON-LD", () => {
  const html = `<script type="application/ld+json">{"@graph":[{"@type":"Recipe","name":"Chicken &amp; Leek Pie",
    "recipeIngredient":["800g chicken thighs","2 leeks, sliced"],"totalTime":"PT1H5M","keywords":"pie, comfort",
    "recipeCuisine":["British"],"image":["https://site.com/pie.jpg"],"datePublished":"2026-11-12"}]}</script>`;
  const r = recipeFromHtml(html)!;
  assert.equal(r.title, "Chicken & Leek Pie");
  assert.equal(r.totalMinutes, 65);
  assert.deepEqual(r.ingredients, ["800g chicken thighs", "2 leeks, sliced"]);
  assert.deepEqual(r.keywords, ["pie", "comfort", "british"]);
  assert.equal(r.imageUrl, "https://site.com/pie.jpg");
  assert.equal(recipeFromHtml("<html>no recipe</html>"), null);
});

test("durations and recipe-looking URLs", () => {
  assert.equal(isoMinutes("PT45M"), 45);
  assert.equal(isoMinutes("P0DT1H"), 60);
  assert.equal(looksLikeRecipeUrl("https://www.site.com/chicken-pie/", "https://site.com"), true);
  assert.equal(looksLikeRecipeUrl("https://site.com/category/dinner/", "https://site.com"), false);
  assert.equal(looksLikeRecipeUrl("https://other.com/x", "https://site.com"), false);
});
