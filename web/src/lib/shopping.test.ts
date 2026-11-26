import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShoppingList, groceriesText, type ListInput } from "./shopping";

const line = (p: Partial<ListInput>): ListInput => ({
  item: "onion",
  amount: null,
  unit: null,
  category: "Produce",
  recipe: "Pie",
  factor: 1,
  ...p,
});

const opts = { aliases: new Map<string, string>(), staples: new Set(["salt", "olive oil"]) };

test("merges the same item across recipes and scales by each night's size", () => {
  const list = buildShoppingList(
    [
      line({ item: "onion", amount: 1, recipe: "Pie" }),
      line({ item: "Onion", amount: 2, recipe: "Curry", factor: 2 }),
    ],
    opts,
  );
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].quantities, ["×5"]);
  assert.deepEqual(list[0].recipes, ["Pie", "Curry"]);
});

test("adds g with kg, turns cups into grams, rounds whole things up", () => {
  const list = buildShoppingList(
    [
      line({ item: "plain flour", amount: 200, unit: "g", category: "Pantry" }),
      line({ item: "plain flour", amount: 1, unit: "kg", category: "Pantry" }),
      line({ item: "plain flour", amount: 1, unit: "cup", category: "Pantry" }),
      line({ item: "puff pastry", amount: 1, unit: "sheet", category: "Pantry", factor: 0.5 }),
      line({ item: "egg", amount: 1, category: "Dairy & Eggs", factor: 0.5 }),
    ],
    opts,
  );
  const get = (n: string) => list.find((i) => i.item === n)!;
  // 200g + 1kg + 1 cup (250ml × 0.55 g/ml ≈ 138g)
  assert.deepEqual(get("plain flour").quantities, ["1.34kg"]);
  assert.deepEqual(get("puff pastry").quantities, ["1 sheet"]);
  assert.deepEqual(get("egg").quantities, ["×1"]);
});

test("leaves out staples, applies 'same thing' aliases, groups by aisle", () => {
  const list = buildShoppingList(
    [
      line({ item: "salt" }),
      line({ item: "scallion", amount: 2 }),
      line({ item: "spring onion", amount: 1 }),
      line({ item: "chicken thigh", amount: 500, unit: "g", category: "Meat & Seafood" }),
      line({ item: "thyme" }),
    ],
    { ...opts, aliases: new Map([["scallion", "spring onion"]]) },
  );
  assert.deepEqual(
    list.map((i) => i.item),
    ["spring onion", "thyme", "chicken thigh"],
  );
  assert.deepEqual(list[0].quantities, ["×3"]);
  assert.deepEqual(list[1].quantities, []);
  assert.equal(
    groceriesText(list),
    "Add to Groceries:\nSpring onion ×3\nThyme\nChicken thigh 500g",
  );
});

test("a Thanksgiving list: American units become grams and millilitres", () => {
  const list = buildShoppingList(
    [
      line({ item: "whole turkey", amount: 12, unit: "lb", category: "Meat & Seafood", recipe: "Roast turkey" }),
      line({ item: "unsalted butter", amount: 1, unit: "stick", category: "Dairy & Eggs", recipe: "Roast turkey" }),
      line({ item: "butter", amount: 4, unit: "tbsp", category: "Dairy & Eggs", recipe: "Mashed potatoes" }),
      line({ item: "butter", amount: 0.5, unit: "cup", category: "Dairy & Eggs", recipe: "Pecan pie" }),
      line({ item: "chicken broth", amount: 4, unit: "cups", category: "Pantry", recipe: "Gravy" }),
      line({ item: "chicken stock", amount: 500, unit: "ml", category: "Pantry", recipe: "Stuffing" }),
      line({ item: "heavy cream", amount: 8, unit: "fl oz", category: "Dairy & Eggs", recipe: "Mashed potatoes" }),
      line({ item: "cream cheese", amount: 8, unit: "oz", category: "Dairy & Eggs", recipe: "Dip" }),
      line({ item: "all-purpose flour", amount: 2.5, unit: "cups", category: "Pantry", recipe: "Pie crust" }),
      line({ item: "light brown sugar", amount: 1, unit: "cup", category: "Pantry", recipe: "Pecan pie" }),
      line({ item: "pecans", amount: 1.5, unit: "cups", category: "Pantry", recipe: "Pecan pie" }),
      line({ item: "cinnamon", amount: 2, unit: "sticks", category: "Spices & Herbs", recipe: "Cider" }),
      line({ item: "large eggs", amount: 3, category: "Dairy & Eggs", recipe: "Pecan pie" }),
      line({ item: "egg yolk", amount: 1, category: "Dairy & Eggs", recipe: "Pie crust" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  const get = (n: string) => list.find((i) => i.item === n)?.quantities;
  assert.deepEqual(get("whole turkey"), ["5.45kg"]);
  // 113g + 4 × 20ml + 125ml, at 0.95 g/ml
  assert.deepEqual(get("butter"), ["310g"]);
  assert.deepEqual(get("chicken stock"), ["1.5 L"]);
  assert.deepEqual(get("thickened cream"), ["240ml"]);
  assert.deepEqual(get("cream cheese"), ["230g"]);
  assert.deepEqual(get("plain flour"), ["345g"]);
  assert.deepEqual(get("brown sugar"), ["225g"]);
  assert.deepEqual(get("pecan"), ["190g"]);
  assert.deepEqual(get("cinnamon"), ["2 sticks"]);
  assert.deepEqual(get("egg"), ["×4"]);
  assert.equal(get("chicken broth"), undefined);
});

test("every kind of salt is one line, and salt and pepper are split", () => {
  const list = buildShoppingList(
    [
      line({ item: "kosher salt", amount: 1, unit: "tbsp", category: "Spices & Herbs", recipe: "Turkey" }),
      line({ item: "salt", amount: 1, unit: "tsp", category: "Spices & Herbs", recipe: "Gravy" }),
      line({ item: "Sea salt flakes", amount: 1, unit: "pinch", category: "Spices & Herbs", recipe: "Pie" }),
      line({ item: "salt and freshly ground black pepper", category: "Spices & Herbs", recipe: "Stuffing" }),
      line({ item: "fine sea salt or kosher salt", category: "Spices & Herbs", recipe: "Sprouts" }),
      line({ item: "pepper", amount: 0.5, unit: "tsp", category: "Spices & Herbs", recipe: "Gravy" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  assert.deepEqual(
    list.map((i) => [i.item, i.quantities]),
    [
      // (20 + 5 + 0.3ml) × 1.1 g/ml; ½ tsp × 0.5 g/ml rounds up to a gram
      ["black pepper", ["2g"]],
      ["salt", ["28g"]],
    ],
  );
  assert.deepEqual(list[1].recipes, ["Turkey", "Gravy", "Pie", "Stuffing", "Sprouts"]);
});

test("staples catch every variety, and the household's own merges still win", () => {
  const list = buildShoppingList(
    [
      line({ item: "kosher salt", amount: 1, unit: "tsp" }),
      line({ item: "extra virgin olive oil", amount: 2, unit: "tbsp" }),
      line({ item: "green onions", amount: 2 }),
    ],
    { aliases: new Map([["spring onion", "shallot"]]), staples: new Set(["salt", "olive oil"]) },
  );
  assert.deepEqual(list.map((i) => i.item), ["shallot"]);
});
