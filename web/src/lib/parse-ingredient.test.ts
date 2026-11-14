import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIngredientLine } from "./parse-ingredient";

test("parses amount, unit, item and prep", () => {
  const r = parseIngredientLine("2 tbsp olive oil, for frying");
  assert.equal(r.amount, 2);
  assert.equal(r.unit, "tbsp");
  assert.equal(r.item, "olive oil");
  assert.equal(r.prep, "for frying");
  assert.equal(r.category, "Pantry");
});

test("handles attached metric units and fractions", () => {
  assert.deepEqual(
    [parseIngredientLine("200g plain flour").amount, parseIngredientLine("200g plain flour").unit],
    [200, "g"],
  );
  assert.equal(parseIngredientLine("1 1/2 cups milk").amount, 1.5);
  assert.equal(parseIngredientLine("½ tsp salt").amount, 0.5);
  assert.equal(parseIngredientLine("1½ cups rice").amount, 1.5);
});

test("counts without units and ranges", () => {
  const onion = parseIngredientLine("2 brown onions, finely diced");
  assert.equal(onion.amount, 2);
  assert.equal(onion.unit, null);
  assert.equal(onion.item, "brown onions");
  assert.equal(onion.category, "Produce");
  assert.equal(parseIngredientLine("2-3 cloves garlic").amount, 3);
  assert.equal(parseIngredientLine("2-3 cloves garlic").unit, "clove");
});

test("no quantity", () => {
  const r = parseIngredientLine("Salt and pepper, to taste");
  assert.equal(r.amount, null);
  assert.equal(r.item, "salt and pepper");
});
