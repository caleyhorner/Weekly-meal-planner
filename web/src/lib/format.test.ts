import { test } from "node:test";
import assert from "node:assert/strict";
import { toFraction, formatQuantity, formatMinutes } from "./format";

test("toFraction rounds to friendly kitchen fractions", () => {
  assert.equal(toFraction(1.5), "1½");
  assert.equal(toFraction(0.333), "⅓");
  assert.equal(toFraction(2.97), "3");
  assert.equal(toFraction(0.25), "¼");
  assert.equal(toFraction(3), "3");
  assert.equal(toFraction(0.02), "⅛");
});

test("formatQuantity handles metric, spoons and counts", () => {
  assert.equal(formatQuantity(1200, "g"), "1.2kg");
  assert.equal(formatQuantity(400, "g"), "400g");
  assert.equal(formatQuantity(333.3, "g"), "335g");
  assert.equal(formatQuantity(1.5, "tbsp"), "1½ tbsp");
  assert.equal(formatQuantity(2, "cup"), "2 cups");
  assert.equal(formatQuantity(3, null), "3");
  assert.equal(formatQuantity(null, null), "");
  assert.equal(formatQuantity(1500, "ml"), "1.5 L");
});

test("formatMinutes", () => {
  assert.equal(formatMinutes(45), "45 min");
  assert.equal(formatMinutes(90), "1 hr 30 min");
  assert.equal(formatMinutes(null), null);
});
