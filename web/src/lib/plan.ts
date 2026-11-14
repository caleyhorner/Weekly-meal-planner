import "server-only";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { mealMultiplier } from "./scaling";
import { todayIn, weekDates } from "./week";

const { planDays, recipes, householdSettings } = schema;

export const TZ_COOKIE = "mp_tz";

/** Today's date where the household is (from the browser's time zone, saved in a cookie). */
export async function householdToday(): Promise<string> {
  return todayIn((await cookies()).get(TZ_COOKIE)?.value);
}

export async function householdSize(): Promise<number> {
  const [row] = await db.select().from(householdSettings).where(eq(householdSettings.id, 1));
  return row?.householdSize ?? 4;
}

export type PlannedDay = {
  date: string;
  status: "empty" | "recipe" | "skip";
  recipe: {
    id: string;
    title: string;
    servings: number;
    minutes: number | null;
  } | null;
  /** Chosen by hand, or null when the household rule decides. */
  chosenMultiplier: number | null;
  multiplier: number;
};

export async function getWeek(start: string): Promise<{ days: PlannedDay[]; household: number }> {
  const dates = weekDates(start);
  const [rows, household] = await Promise.all([
    db
      .select({
        date: planDays.date,
        status: planDays.status,
        multiplier: planDays.multiplier,
        recipeId: recipes.id,
        title: recipes.title,
        servings: recipes.servings,
        prepMinutes: recipes.prepMinutes,
        cookMinutes: recipes.cookMinutes,
      })
      .from(planDays)
      .leftJoin(recipes, eq(planDays.recipeId, recipes.id))
      .where(and(gte(planDays.date, dates[0]), lte(planDays.date, dates[6]))),
    householdSize(),
  ]);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const days = dates.map((date): PlannedDay => {
    const r = byDate.get(date);
    if (r?.status === "skip") {
      return { date, status: "skip", recipe: null, chosenMultiplier: null, multiplier: 1 };
    }
    if (!r || !r.recipeId || r.servings == null) {
      return { date, status: "empty", recipe: null, chosenMultiplier: null, multiplier: 1 };
    }
    const minutes = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
    return {
      date,
      status: "recipe",
      recipe: { id: r.recipeId, title: r.title!, servings: r.servings, minutes: minutes || null },
      chosenMultiplier: r.multiplier,
      multiplier: mealMultiplier(r.servings, household, r.multiplier),
    };
  });
  return { days, household };
}

export async function setDayRecipe(date: string, recipeId: string) {
  await db
    .insert(planDays)
    .values({ date, recipeId, status: "recipe", multiplier: null })
    .onConflictDoUpdate({
      target: planDays.date,
      set: { recipeId, status: "recipe", multiplier: null },
    });
}

export async function skipDay(date: string) {
  await db
    .insert(planDays)
    .values({ date, recipeId: null, status: "skip", multiplier: null })
    .onConflictDoUpdate({
      target: planDays.date,
      set: { recipeId: null, status: "skip", multiplier: null },
    });
}

export async function clearDay(date: string) {
  await db.delete(planDays).where(eq(planDays.date, date));
}

export async function setMultiplier(date: string, multiplier: number | null) {
  await db.update(planDays).set({ multiplier }).where(eq(planDays.date, date));
}

/** Moves a day's plan onto another day, swapping with whatever was there. */
export async function swapDays(from: string, to: string) {
  if (from === to) return;
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(planDays).where(inArray(planDays.date, [from, to]));
    const a = rows.find((r) => r.date === from);
    const b = rows.find((r) => r.date === to);
    await tx.delete(planDays).where(inArray(planDays.date, [from, to]));
    const moved = [
      a && { ...a, date: to },
      b && { ...b, date: from },
    ].filter((r): r is NonNullable<typeof r> => Boolean(r));
    if (moved.length) await tx.insert(planDays).values(moved);
  });
}
