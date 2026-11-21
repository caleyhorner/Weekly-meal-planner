import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, weekDates, weekRangeLabel, weekStartFor } from "./week";
import { autoMultiplier, servesLabel } from "./scaling";

test("weeks start on Saturday", () => {
  assert.equal(weekStartFor("2026-11-14"), "2026-11-14"); // Saturday
  assert.equal(weekStartFor("2026-11-20"), "2026-11-14"); // Friday
  assert.equal(weekStartFor("2026-11-15"), "2026-11-14"); // Sunday
  assert.equal(weekStartFor("2026-11-21"), "2026-11-21"); // next Saturday
  assert.deepEqual(weekDates("2026-11-14").at(-1), "2026-11-20");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("week range label", () => {
  assert.equal(weekRangeLabel("2026-11-14"), "14 – 20 Nov");
  assert.equal(weekRangeLabel("2026-11-28"), "28 Nov – 4 Dec");
});

test("scaling for a family of four: ½, 1, 2 or 3, smallest that feeds everyone", () => {
  const four = (serves: number) => autoMultiplier(serves, 4);
  assert.equal(four(2), 2);
  assert.equal(four(3), 2); // makes 6
  assert.equal(four(4), 1);
  assert.equal(four(5), 1);
  assert.equal(four(6), 1); // leftovers rather than ⅔
  assert.equal(four(8), 0.5);
  assert.equal(four(10), 0.5); // makes 5
  assert.equal(four(1), 4); // fallback for single-serve recipes
  assert.equal(servesLabel(2.5), "2½");
});
