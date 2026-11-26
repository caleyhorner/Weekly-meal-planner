import { test } from "node:test";
import assert from "node:assert/strict";
import { densityOf, normaliseUnit, toMetric } from "./units";
import { canonicalItems } from "./item-names";
import { formatMetric } from "./shopping";

test("converts to grams and millilitres with Australian spoons and cups", () => {
  assert.deepEqual(toMetric(1, "cup"), { amount: 250, unit: "ml" });
  assert.deepEqual(toMetric(2, "Tablespoons"), { amount: 40, unit: "ml" });
  assert.deepEqual(toMetric(1, "tsp"), { amount: 5, unit: "ml" });
  assert.deepEqual(toMetric(2, "lbs"), { amount: 907.2, unit: "g" });
  assert.deepEqual(toMetric(1, "kg"), { amount: 1000, unit: "g" });
  assert.equal(toMetric(1, "stick", "unsalted butter")?.amount, 113);
  assert.equal(toMetric(1, "stick", "cinnamon"), null);
  assert.equal(toMetric(1, "can"), null);
  assert.equal(toMetric(3, null), null);
  assert.equal(normaliseUnit("T"), "tbsp");
  assert.equal(normaliseUnit("fl. oz"), "fl oz");
});

test("knows how heavy common things are, matching whole words", () => {
  assert.equal(densityOf("plain flour")?.buy, "g");
  assert.equal(densityOf("chicken stock")?.buy, "ml");
  assert.equal(densityOf("cream cheese")?.buy, "g");
  assert.equal(densityOf("thickened cream")?.buy, "ml");
  assert.equal(densityOf("butternut pumpkin")?.density, 0.55);
  assert.equal(densityOf("butter")?.density, 0.95);
  assert.equal(densityOf("milk chocolate")?.buy, "g");
});

test("one name per item", () => {
  assert.deepEqual(canonicalItems("Kosher salt"), ["salt"]);
  assert.deepEqual(canonicalItems("salt & pepper (to taste)"), ["salt", "black pepper"]);
  assert.deepEqual(canonicalItems("large eggs"), ["egg"]);
  assert.deepEqual(canonicalItems("fresh thyme leaves"), ["thyme"]);
  assert.deepEqual(canonicalItems("bay leaves"), ["bay leaf"]);
  assert.deepEqual(canonicalItems("low-sodium chicken broth"), ["chicken stock"]);
  assert.deepEqual(canonicalItems("all-purpose flour"), ["plain flour"]);
  assert.deepEqual(canonicalItems("garlic cloves"), ["garlic"]);
  assert.deepEqual(canonicalItems("macaroni and cheese"), ["macaroni and cheese"]);
  assert.deepEqual(canonicalItems("chicken or vegetable stock"), ["chicken or vegetable stock"]);
  assert.deepEqual(canonicalItems("unsalted butter"), ["butter"]);
  assert.deepEqual(canonicalItems("brussels sprouts"), ["brussels sprout"]);
});

test("shopping amounts round up", () => {
  assert.equal(formatMetric(0.3, "g"), "1g");
  assert.equal(formatMetric(27.8, "g"), "28g");
  assert.equal(formatMetric(337.5, "g"), "340g");
  assert.equal(formatMetric(1337.5, "g"), "1.34kg");
  assert.equal(formatMetric(1500, "ml"), "1.5 L");
});
