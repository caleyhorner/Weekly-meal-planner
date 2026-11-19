import { test } from "node:test";
import assert from "node:assert/strict";
import { itemKey, keysFromLines, sameItem, scoreCandidates, type Candidate } from "./score";

test("item keys ignore amounts, sizes and prep", () => {
  assert.equal(itemKey("Brown onions (about 2), finely diced"), "brown onion");
  assert.equal(itemKey("fresh coriander leaves"), "coriander leave");
  assert.deepEqual(keysFromLines(["800g chicken thighs, boneless", "2 leeks, sliced", "1 cup (250ml) cream"]), [
    "chicken thigh",
    "leek",
    "cream",
  ]);
});

test("matching items", () => {
  assert.equal(sameItem("onion", "brown onion"), true);
  assert.equal(sameItem("chicken thigh", "chicken thigh"), true);
  assert.equal(sameItem("chicken", "chicken stock"), false);
  assert.equal(sameItem("tomato", "tomato paste"), false);
  assert.equal(sameItem("milk", "coconut milk"), false);
  assert.equal(sameItem("butter", "peanut butter"), false);
});

const c = (id: string, ingredients: string[], publishedAt: Date | null = null): Candidate => ({
  id,
  title: id,
  ingredients,
  sourceName: "Test Kitchen",
  publishedAt,
});

const base = {
  library: [
    { title: "Chicken & leek pie", items: ["chicken thigh", "leek", "puff pastry", "cream", "thyme"], timesCooked: 4 },
    { title: "Thai green curry", items: ["chicken thigh", "coconut milk", "green curry paste", "basil"], timesCooked: 1 },
  ],
  shopping: ["spinach", "feta", "lemon"],
  staples: new Set(["salt", "pepper", "olive oil", "water"]),
  dismissed: [] as string[][],
  now: new Date("2026-11-19"),
};

test("ranks recipes like the ones you cook, and says why", () => {
  const ranked = scoreCandidates(
    [
      c("chocolate cake", ["200g dark chocolate", "3 eggs", "1 cup flour"]),
      c("leek and chicken gratin", ["600g chicken thighs", "3 leeks", "300ml cream", "1 tsp thyme", "salt"]),
    ],
    base,
  );
  assert.equal(ranked[0].id, "leek and chicken gratin");
  assert.equal(ranked[0].reason, "Like your Chicken & leek pie");
});

test("prefers recipes that use what's on this week's list", () => {
  const ranked = scoreCandidates(
    [
      c("plain pasta", ["400g spaghetti", "1 jar passata"]),
      c("spinach pie", ["500g spinach", "200g feta, crumbled", "1 sheet filo pastry"]),
    ],
    base,
  );
  assert.equal(ranked[0].id, "spinach pie");
  assert.equal(ranked[0].reason, "Uses spinach and feta from this week's list");
});

test("'Not for us' pushes similar recipes down; new posts get a nudge", () => {
  const similar = c("creamy leek chicken", ["chicken thighs", "leeks", "cream", "thyme"]);
  const ranked = scoreCandidates([similar, c("different", ["chicken thighs", "coconut milk", "basil"])], {
    ...base,
    dismissed: [["chicken thigh", "leek", "cream", "thyme"]],
  });
  assert.equal(ranked[0].id, "different");

  const [newer] = scoreCandidates(
    [c("old", ["spaghetti", "passata"]), c("new", ["spaghetti", "passata"], new Date("2026-11-15"))],
    base,
  );
  assert.equal(newer.id, "new");
});

test("reasons skip everyday basics and don't double-count", () => {
  const [top] = scoreCandidates([c("massaman", ["1 can coconut milk", "1kg beef chuck", "3 eggs", "1 cup plain flour"])], {
    ...base,
    shopping: ["coconut milk", "milk", "egg", "plain flour", "beef chuck"],
  });
  assert.equal(top.reason, "Uses coconut milk and beef chuck from this week's list");
});
