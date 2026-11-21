import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { mealMultiplier } from "./scaling";
import { shoppingListFor } from "./shopping-data";

// Dinner parties: a menu of dishes for one occasion, each sized to feed every guest,
// with its own shopping list. Separate from the weekly plan.

const { dinnerParties, partyDishes, partyHaveIt, recipes } = schema;

export const MAX_GUESTS = 40;

export type PartySummary = { id: string; name: string; date: string | null; guests: number; dishes: number };

export async function listParties(): Promise<PartySummary[]> {
  return db
    .select({
      id: dinnerParties.id,
      name: dinnerParties.name,
      date: dinnerParties.date,
      guests: dinnerParties.guests,
      dishes: sql<number>`(select count(*)::int from ${partyDishes} where ${partyDishes.partyId} = ${dinnerParties.id})`,
    })
    .from(dinnerParties)
    .orderBy(sql`${dinnerParties.date} asc nulls last`, desc(dinnerParties.createdAt));
}

export type PartyDish = {
  id: string;
  recipe: { id: string; title: string; servings: number; minutes: number | null; thumb: string | null };
  /** Chosen by hand, or null when it's sized to feed every guest. */
  chosenMultiplier: number | null;
  multiplier: number;
};

export type Party = { id: string; name: string; date: string | null; guests: number; dishes: PartyDish[] };

export async function getParty(id: string): Promise<Party | null> {
  const [party] = await db.select().from(dinnerParties).where(eq(dinnerParties.id, id));
  if (!party) return null;
  const rows = await db
    .select({
      id: partyDishes.id,
      multiplier: partyDishes.multiplier,
      recipeId: recipes.id,
      title: recipes.title,
      servings: recipes.servings,
      prepMinutes: recipes.prepMinutes,
      cookMinutes: recipes.cookMinutes,
      thumb: recipes.heroImageUrl,
    })
    .from(partyDishes)
    .innerJoin(recipes, eq(partyDishes.recipeId, recipes.id))
    .where(eq(partyDishes.partyId, id))
    .orderBy(asc(partyDishes.createdAt));
  return {
    id: party.id,
    name: party.name,
    date: party.date,
    guests: party.guests,
    dishes: rows.map((r) => ({
      id: r.id,
      recipe: {
        id: r.recipeId,
        title: r.title,
        servings: r.servings,
        minutes: (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0) || null,
        thumb: r.thumb,
      },
      chosenMultiplier: r.multiplier,
      multiplier: mealMultiplier(r.servings, party.guests, r.multiplier),
    })),
  };
}

export async function createParty(input: { name: string; date: string | null; guests: number }): Promise<string> {
  const [row] = await db.insert(dinnerParties).values(input).returning({ id: dinnerParties.id });
  return row.id;
}

export async function updateParty(id: string, input: { name: string; date: string | null; guests: number }) {
  await db.update(dinnerParties).set(input).where(eq(dinnerParties.id, id));
}

export async function deleteParty(id: string) {
  await db.delete(dinnerParties).where(eq(dinnerParties.id, id));
}

/** Adds a recipe to the menu (once: to make more of it, change its size). */
export async function addDish(partyId: string, recipeId: string) {
  const [existing] = await db
    .select({ id: partyDishes.id })
    .from(partyDishes)
    .where(and(eq(partyDishes.partyId, partyId), eq(partyDishes.recipeId, recipeId)));
  if (!existing) await db.insert(partyDishes).values({ partyId, recipeId, multiplier: null });
}

export async function removeDish(partyId: string, dishId: string) {
  await db.delete(partyDishes).where(and(eq(partyDishes.id, dishId), eq(partyDishes.partyId, partyId)));
}

export async function setDishMultiplier(partyId: string, dishId: string, multiplier: number | null) {
  await db
    .update(partyDishes)
    .set({ multiplier })
    .where(and(eq(partyDishes.id, dishId), eq(partyDishes.partyId, partyId)));
}

export async function getPartyShoppingList(party: Party) {
  const haveRows = await db.select().from(partyHaveIt).where(eq(partyHaveIt.partyId, party.id));
  return shoppingListFor(
    party.dishes.map((d) => ({ recipe: d.recipe, factor: d.multiplier })),
    new Set(haveRows.map((r) => r.item)),
  );
}

export async function setPartyHaveIt(partyId: string, item: string, haveIt: boolean) {
  if (haveIt) {
    await db.insert(partyHaveIt).values({ partyId, item }).onConflictDoNothing();
  } else {
    await db.delete(partyHaveIt).where(and(eq(partyHaveIt.partyId, partyId), eq(partyHaveIt.item, item)));
  }
}
