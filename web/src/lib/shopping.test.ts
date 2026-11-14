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

test("adds g with kg, keeps cups separate, rounds whole things up", () => {
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
  assert.deepEqual(get("plain flour").quantities, ["1.2kg", "1 cup"]);
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
