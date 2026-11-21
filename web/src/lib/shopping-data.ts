import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getWeek, getWeekSnacks } from "./plan";
import { buildShoppingList, type ListInput, type ShoppingItem } from "./shopping";

const { recipeIngredients, itemAliases, staples, shoppingHaveIt, householdSettings } = schema;

export async function listStaples(): Promise<string[]> {
  const rows = await db.select().from(staples).orderBy(asc(staples.item));
  return rows.map((r) => r.item);
}

export async function listAliases() {
  return db.select().from(itemAliases).orderBy(asc(itemAliases.alias));
}

export type WeekList = {
  items: (ShoppingItem & { haveIt: boolean })[];
  dinners: number;
  snacks: number;
};

/** A recipe to shop for, and how many times over to make it. */
export type ListMeal = { recipe: { id: string; title: string }; factor: number };

/**
 * Merges the ingredients of these meals into one shopping list (aliases merged, staples left
 * off). `haveIt` holds the items already ticked as "have it". Shared by the week and parties.
 */
export async function shoppingListFor(meals: ListMeal[], haveIt: Set<string>) {
  const ids = [...new Set(meals.map((m) => m.recipe.id))];
  const [ingredients, aliasRows, stapleRows] = await Promise.all([
    ids.length
      ? db.select().from(recipeIngredients).where(inArray(recipeIngredients.recipeId, ids))
      : Promise.resolve([]),
    listAliases(),
    listStaples(),
  ]);

  const byRecipe = new Map<string, typeof ingredients>();
  for (const ing of ingredients) {
    const list = byRecipe.get(ing.recipeId) ?? [];
    list.push(ing);
    byRecipe.set(ing.recipeId, list);
  }

  // One line per ingredient per planned meal (the same recipe twice counts twice).
  const lines: ListInput[] = meals.flatMap((m) =>
    (byRecipe.get(m.recipe.id) ?? []).map((ing) => ({
      item: ing.item,
      amount: ing.amount,
      unit: ing.unit,
      category: ing.category,
      recipe: m.recipe.title,
      factor: m.factor,
    })),
  );

  const list = buildShoppingList(lines, {
    aliases: new Map(aliasRows.map((a) => [a.alias, a.item])),
    staples: new Set(stapleRows),
  });
  return list.map((i) => ({ ...i, haveIt: haveIt.has(i.item) }));
}

export async function getShoppingList(weekStart: string): Promise<WeekList> {
  const [{ days }, snacks, haveRows] = await Promise.all([
    getWeek(weekStart),
    getWeekSnacks(weekStart),
    db.select().from(shoppingHaveIt).where(eq(shoppingHaveIt.weekStart, weekStart)),
  ]);
  const planned = days.filter((d) => d.status === "recipe" && d.recipe);
  // Dinners (at each night's size) and snacks (by the batch) both go on the list.
  const meals = [
    ...planned.map((d) => ({ recipe: d.recipe!, factor: d.multiplier })),
    ...snacks.map((s) => ({ recipe: s.recipe, factor: s.multiplier })),
  ];
  const have = new Set(haveRows.filter((r) => r.haveIt).map((r) => r.item));
  return { items: await shoppingListFor(meals, have), dinners: planned.length, snacks: snacks.length };
}

export async function setHaveIt(weekStart: string, item: string, haveIt: boolean) {
  if (haveIt) {
    await db
      .insert(shoppingHaveIt)
      .values({ weekStart, item, haveIt: true })
      .onConflictDoUpdate({ target: [shoppingHaveIt.weekStart, shoppingHaveIt.item], set: { haveIt: true } });
  } else {
    await db
      .delete(shoppingHaveIt)
      .where(and(eq(shoppingHaveIt.weekStart, weekStart), eq(shoppingHaveIt.item, item)));
  }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function addStaple(item: string) {
  const v = norm(item);
  if (v) await db.insert(staples).values({ item: v }).onConflictDoNothing();
}

export async function removeStaple(item: string) {
  await db.delete(staples).where(eq(staples.item, norm(item)));
}

/** Remember that `alias` is the same shopping item as `item`. */
export async function addAlias(alias: string, item: string) {
  const a = norm(alias);
  const target = norm(item);
  if (!a || !target || a === target) return;
  await db.transaction(async (tx) => {
    // Anything that pointed at the alias now points at the new name, so chains stay flat.
    await tx.update(itemAliases).set({ item: target }).where(eq(itemAliases.item, a));
    await tx
      .insert(itemAliases)
      .values({ alias: a, item: target })
      .onConflictDoUpdate({ target: itemAliases.alias, set: { item: target } });
  });
}

export async function removeAlias(alias: string) {
  await db.delete(itemAliases).where(eq(itemAliases.alias, norm(alias)));
}

export async function setHouseholdSize(size: number) {
  await db
    .insert(householdSettings)
    .values({ id: 1, householdSize: size })
    .onConflictDoUpdate({ target: householdSettings.id, set: { householdSize: size } });
}
