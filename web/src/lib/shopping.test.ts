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
  // 3 spring onions: one bunch
  assert.deepEqual(list[0].quantities, ["1 bunch"]);
  assert.deepEqual(list[1].quantities, []);
  assert.equal(
    groceriesText(list),
    "Add to Groceries:\nSpring onion 1 bunch\nThyme\nChicken thigh 500g",
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

test("odd units, units left in names and pack sizes all become grams and millilitres", () => {
  const list = buildShoppingList(
    [
      line({ item: "lbs sweet potatoes", amount: 3, category: "Produce", raw: "3 lbs sweet potatoes" }),
      line({ item: "russet potato", amount: 2, unit: "pounds (about 1 kg)", category: "Produce" }),
      line({ item: "sugar", amount: 2, unit: "heaped tbsp", category: "Pantry" }),
      line({ item: "brown sugar", amount: 1, unit: "cup(s), packed", category: "Pantry" }),
      line({ item: "vanilla extract", amount: 2, unit: "teaspoons", category: "Pantry" }),
      line({ item: "pumpkin puree", amount: 2, unit: "can", category: "Pantry", raw: "2 (15-ounce) cans pumpkin puree" }),
      line({ item: "turkey", amount: 1, category: "Meat & Seafood", raw: "1 (12 to 14 lb) whole turkey" }),
      line({ item: "chickpeas", amount: 1, unit: "can", category: "Pantry", raw: "1 can chickpeas, drained" }),
      line({ item: "onion", amount: 2, category: "Produce", raw: "2 onions (about 300g)" }),
      line({ item: "ground beef", amount: 1, category: "Meat & Seafood", raw: "1 lb ground beef" }),
      line({ item: "mini marshmallow", amount: 2, unit: "cups", category: "Pantry" }),
      line({ item: "egg", amount: 3, unit: "large", category: "Dairy & Eggs" }),
      line({ item: "butter", amount: 1, unit: "knob", category: "Dairy & Eggs" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  const get = (n: string) => list.find((i) => i.item === n)?.quantities;
  // 3 lb ≈ 1.36kg at 400g each
  assert.deepEqual(get("sweet potato"), ["×4"]);
  // 2 lb ≈ 907g at 200g each
  assert.deepEqual(get("russet potato"), ["×5"]);
  assert.deepEqual(get("sugar"), ["34g"]);
  assert.deepEqual(get("brown sugar"), ["225g"]);
  assert.deepEqual(get("vanilla extract"), ["10ml"]);
  assert.deepEqual(get("pumpkin puree"), ["855g"]);
  assert.deepEqual(get("turkey"), ["6.36kg"]);
  assert.deepEqual(get("chickpea"), ["1 can"]);
  assert.deepEqual(get("onion"), ["×2"]);
  assert.deepEqual(get("beef mince"), ["455g"]);
  assert.deepEqual(get("mini marshmallow"), ["250g"]);
  assert.deepEqual(get("egg"), ["×3"]);
  assert.deepEqual(get("butter"), ["19g"]);
  // Nothing left in cups, spoons, pounds or ounces.
  const all = list.flatMap((i) => [i.item, ...i.quantities]).join(" ");
  assert.doesNotMatch(all, /\b(cups?|tsp|tbsp|lbs?|oz|pounds?|ounces?|teaspoons?|tablespoons?)\b/i);
});

test("the Thanksgiving party's leftovers: cheeses, dates, garlic and handfuls", () => {
  const list = buildShoppingList(
    [
      line({ item: "feta", amount: 0.5, unit: "cup", category: "Dairy & Eggs", recipe: "Carpaccio" }),
      line({ item: "feta cheese", amount: 6, unit: "oz", category: "Dairy & Eggs", recipe: "Dates" }),
      line({ item: "medjool dates", amount: 12, category: "Produce", recipe: "Beans" }),
      line({ item: "date", amount: 2 / 3, unit: "cup", category: "Produce", recipe: "Carrots" }),
      line({ item: "garlic", amount: 30, unit: "cloves", category: "Produce", recipe: "Turkey" }),
      line({ item: "garlic cloves", amount: 2, category: "Produce", recipe: "Salad" }),
      line({ item: "arugula", amount: 2, unit: "handfuls", category: "Produce", recipe: "Carpaccio" }),
      line({ item: "pork sausage", amount: 1.5, unit: "lbs", category: "Meat & Seafood", recipe: "Stuffing" }),
      line({ item: "fresh rosemary", amount: 5, unit: "tbsp", category: "Produce", recipe: "Stuffing" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  const get = (n: string) => list.find((i) => i.item === n)?.quantities;
  // ½ cup crumbled × 0.6 g/ml = 75g, plus 6 oz = 170g
  assert.deepEqual(get("feta"), ["250g"]);
  assert.equal(get("feta cheese"), undefined);
  // 12 medjool dates × 20g + ⅔ cup (167ml × 0.6 g/ml)
  assert.deepEqual(get("date"), ["340g"]);
  assert.deepEqual(get("garlic"), ["4 bulbs (32 cloves)"]);
  assert.deepEqual(get("rocket"), ["60g"]);
  assert.deepEqual(get("pork sausage"), ["685g"]);
  // 5 tbsp ≈ 20g: one bunch
  assert.deepEqual(get("rosemary"), ["1 bunch"]);
});

test("a count and a weight of the same fruit become one weight", () => {
  const list = buildShoppingList(
    [
      line({ item: "date", amount: 12, category: "Produce" }),
      line({ item: "dates", amount: 2 / 3, unit: "cup", category: "Produce" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  // 12 × 20g + 167ml × 0.6 g/ml
  assert.deepEqual(list[0].quantities, ["340g"]);
});

test("apples, onions and bread are bought one at a time, so the list counts them", () => {
  const list = buildShoppingList(
    [
      line({ item: "granny smith apples", amount: 6, unit: "lbs", category: "Produce", recipe: "Apple pie" }),
      line({ item: "apple", amount: 1, category: "Produce", recipe: "Salad" }),
      line({ item: "onion", amount: 2, unit: "cups", category: "Produce", recipe: "Stuffing" }),
      line({ item: "brown onion", amount: 1, category: "Produce", recipe: "Gravy" }),
      line({ item: "cubed day-old sourdough bread", amount: 12, unit: "cups", category: "Bakery", recipe: "Stuffing" }),
      line({ item: "sourdough loaf", amount: 1, category: "Bakery", recipe: "Toast" }),
      line({ item: "lemons", amount: 2, category: "Produce", recipe: "Turkey" }),
      line({ item: "cherry tomatoes", amount: 250, unit: "g", category: "Produce", recipe: "Salad" }),
      line({ item: "crushed tomatoes", amount: 2, unit: "can", category: "Pantry", raw: "2 (400g) cans crushed tomatoes" }),
      line({ item: "baguette", amount: 1, category: "Bakery", recipe: "Dip" }),
      line({ item: "coriander", amount: 2, unit: "bunches", category: "Produce", recipe: "Salsa" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  const get = (n: string) => list.find((i) => i.item === n)?.quantities;
  // 6 lb ≈ 2.72kg at 180g an apple = 15.1 → 16, plus 1
  assert.deepEqual(get("granny smith apple"), ["×16"]);
  assert.deepEqual(get("apple"), ["×1"]);
  // 2 cups × 0.55 g/ml = 275g ÷ 160g = 1.7 → 2
  assert.deepEqual(get("onion"), ["×2"]);
  assert.deepEqual(get("brown onion"), ["×1"]);
  // 12 cups × 250ml × 0.17 g/ml = 510g ÷ 700g + 1 loaf
  assert.deepEqual(get("sourdough bread"), ["2 loaves"]);
  assert.deepEqual(get("lemon"), ["×2"]);
  assert.deepEqual(get("cherry tomato"), ["250g"]);
  assert.deepEqual(get("crushed tomato"), ["800g"]);
  assert.deepEqual(get("baguette"), ["×1"]);
  assert.deepEqual(get("coriander"), ["2 bunches"]);
});

test("fruit and veg are counted or bunched, not weighed", () => {
  const list = buildShoppingList(
    [
      line({ item: "carrots", amount: 3, unit: "lbs", category: "Produce", recipe: "Roast carrots" }),
      line({ item: "cavolo nero", amount: 450, unit: "g", category: "Produce", recipe: "Caesar" }),
      line({ item: "celery", amount: 4, unit: "stalks", category: "Produce", recipe: "Stuffing" }),
      line({ item: "celery", amount: 1, unit: "cup", category: "Produce", recipe: "Gravy" }),
      line({ item: "spring onions", amount: 3, category: "Produce", recipe: "Salad" }),
      line({ item: "fresh basil", amount: 4, unit: "tbsp", category: "Produce", recipe: "Ricotta" }),
      line({ item: "flat-leaf parsley", amount: 1, unit: "cup", category: "Produce", recipe: "Stuffing" }),
      line({ item: "pears", amount: 2, unit: "lbs", category: "Produce", recipe: "Carpaccio" }),
      line({ item: "butternut squash", amount: 2, unit: "lbs", category: "Produce", recipe: "Soup" }),
      line({ item: "brussels sprouts", amount: 1, unit: "lb", category: "Produce", recipe: "Caesar" }),
      line({ item: "mushrooms", amount: 8, unit: "oz", category: "Produce", recipe: "Gravy" }),
      line({ item: "green beans", amount: 1.5, unit: "lbs", category: "Produce", recipe: "Beans" }),
      line({ item: "fresh cranberries", amount: 12, unit: "oz", category: "Produce", recipe: "Sauce" }),
    ],
    { aliases: new Map(), staples: new Set() },
  );
  const get = (n: string) => list.find((i) => i.item === n)?.quantities;
  // 3 lb ≈ 1.36kg at 130g a carrot
  assert.deepEqual(get("carrot"), ["×11"]);
  assert.deepEqual(get("cavolo nero"), ["2 bunches"]);
  // 4 stalks + a cup (≈138g) of a 10-stalk, 600g bunch
  assert.deepEqual(get("celery"), ["1 bunch"]);
  assert.deepEqual(get("spring onion"), ["1 bunch"]);
  assert.deepEqual(get("basil"), ["1 bunch"]);
  // 1 cup × 0.2 g/ml = 50g of a 40g bunch
  assert.deepEqual(get("flat-leaf parsley"), ["2 bunches"]);
  assert.deepEqual(get("pear"), ["×6"]);
  assert.deepEqual(get("butternut squash"), ["×1"]);
  // Bought loose by weight, in bags or punnets
  assert.deepEqual(get("brussels sprout"), ["455g"]);
  assert.deepEqual(get("mushroom"), ["230g"]);
  assert.deepEqual(get("green bean"), ["685g"]);
  assert.deepEqual(get("cranberry"), ["345g"]);
});
