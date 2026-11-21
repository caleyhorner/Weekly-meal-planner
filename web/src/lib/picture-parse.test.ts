import { test } from "node:test";
import assert from "node:assert/strict";
import { cropRect, isUnhelpfulSite, linksInText, pagePicture, publicHttpsUrl } from "./picture-parse";

test("publicHttpsUrl accepts ordinary https links only", () => {
  assert.ok(publicHttpsUrl("https://www.recipetineats.com/chicken-pie/"));
  assert.equal(publicHttpsUrl("http://example.com/a.jpg"), null);
  assert.equal(publicHttpsUrl("https://localhost/a.jpg"), null);
  assert.equal(publicHttpsUrl("https://127.0.0.1/a.jpg"), null);
  assert.equal(publicHttpsUrl("https://[::1]/a.jpg"), null);
  assert.equal(publicHttpsUrl("https://printer.local/a.jpg"), null);
  assert.equal(publicHttpsUrl("https://user:pw@example.com/a.jpg"), null);
  assert.equal(publicHttpsUrl("not a link"), null);
});

test("isUnhelpfulSite spots social and video sites", () => {
  assert.equal(isUnhelpfulSite(new URL("https://au.pinterest.com/pin/1")), true);
  assert.equal(isUnhelpfulSite(new URL("https://www.youtube.com/watch?v=1")), true);
  assert.equal(isUnhelpfulSite(new URL("https://www.jamieoliver.com/recipes/x")), false);
});

test("linksInText reads one link per line and trims punctuation", () => {
  const text = "Best pages:\n1. https://a.com/one.\n- https://b.com/two?x=1\nhttps://a.com/one";
  assert.deepEqual(linksInText(text), ["https://a.com/one", "https://b.com/two?x=1"]);
});

test("pagePicture prefers the recipe's own picture", () => {
  const html = `
    <meta property="og:image" content="https://site.com/share.jpg">
    <script type="application/ld+json">{"@type":"Recipe","name":"Pie","image":["https://site.com/pie-1x1.jpg"]}</script>`;
  assert.equal(pagePicture(html, "https://site.com/pie"), "https://site.com/pie-1x1.jpg");
});

test("pagePicture falls back to the share image, resolves relative links and skips logos", () => {
  assert.equal(
    pagePicture(`<meta property="og:image" content="/img/pie.jpg">`, "https://site.com/recipes/pie"),
    "https://site.com/img/pie.jpg",
  );
  assert.equal(
    pagePicture(`<meta property="og:image" content="http://site.com/pie.jpg">`, "https://site.com/pie"),
    "https://site.com/pie.jpg",
  );
  assert.equal(pagePicture(`<meta property="og:image" content="https://site.com/logo.png">`, "https://site.com/"), null);
  assert.equal(pagePicture(`<p>No pictures</p>`, "https://site.com/"), null);
});

test("cropRect scales the box up to the full-size photo", () => {
  const rect = cropRect({ left: 100, top: 50, right: 500, bottom: 350 }, { width: 1000, height: 750 }, { width: 2000, height: 1500 });
  assert.deepEqual(rect, { left: 200, top: 100, width: 800, height: 600 });
});

test("cropRect clamps, and ignores tiny boxes and boxes covering the whole photo", () => {
  assert.deepEqual(
    cropRect({ left: -20, top: 400, right: 600, bottom: 900 }, { width: 600, height: 800 }, { width: 600, height: 800 }),
    { left: 0, top: 400, width: 600, height: 400 },
  );
  assert.equal(cropRect({ left: 0, top: 0, right: 100, bottom: 100 }, { width: 1000, height: 1000 }, { width: 1000, height: 1000 }), null);
  assert.equal(cropRect({ left: 0, top: 0, right: 990, bottom: 990 }, { width: 1000, height: 1000 }, { width: 1000, height: 1000 }), null);
});
