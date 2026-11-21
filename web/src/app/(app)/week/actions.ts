"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import {
  addWeekSnack,
  clearDay,
  removeWeekSnack,
  setDayRecipe,
  setMultiplier,
  setSnackMultiplier,
  skipDay,
  swapDays,
} from "@/lib/plan";
import { MULTIPLIERS } from "@/lib/scaling";
import { isIsoDate, weekStartFor } from "@/lib/week";

const UUID = /^[0-9a-f-]{36}$/i;

function check(date: string) {
  if (!isIsoDate(date)) throw new Error("Bad date");
}

function done(date: string) {
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/list");
  return weekStartFor(date);
}

export async function pickRecipeAction(date: string, recipeId: string) {
  await requireHousehold();
  check(date);
  if (!UUID.test(recipeId)) throw new Error("Bad recipe");
  await setDayRecipe(date, recipeId);
  redirect(`/?week=${done(date)}`);
}

export async function planRecipeAction(date: string, recipeId: string) {
  await requireHousehold();
  check(date);
  if (!UUID.test(recipeId)) throw new Error("Bad recipe");
  await setDayRecipe(date, recipeId);
  done(date);
}

export async function skipDayAction(date: string) {
  await requireHousehold();
  check(date);
  await skipDay(date);
  done(date);
}

export async function clearDayAction(date: string) {
  await requireHousehold();
  check(date);
  await clearDay(date);
  done(date);
}

export async function setMultiplierAction(date: string, multiplier: number | null) {
  await requireHousehold();
  check(date);
  if (multiplier !== null && !(MULTIPLIERS as readonly number[]).includes(multiplier)) {
    throw new Error("Bad size");
  }
  await setMultiplier(date, multiplier);
  done(date);
}

export async function moveDayAction(from: string, to: string) {
  await requireHousehold();
  check(from);
  check(to);
  await swapDays(from, to);
  done(from);
}

// ─── Snacks ──────────────────────────────────────────────────────────────────

export async function addSnackAction(weekStart: string, recipeId: string) {
  await requireHousehold();
  check(weekStart);
  if (!UUID.test(recipeId)) throw new Error("Bad recipe");
  await addWeekSnack(weekStart, recipeId);
  redirect(`/?week=${done(weekStart)}#snacks`);
}

export async function removeSnackAction(id: string) {
  await requireHousehold();
  if (!UUID.test(id)) throw new Error("Bad snack");
  await removeWeekSnack(id);
  revalidatePath("/");
  revalidatePath("/list");
}

export async function setSnackMultiplierAction(id: string, multiplier: number) {
  await requireHousehold();
  if (!UUID.test(id)) throw new Error("Bad snack");
  if (!(MULTIPLIERS as readonly number[]).includes(multiplier)) throw new Error("Bad size");
  await setSnackMultiplier(id, multiplier);
  revalidatePath("/");
  revalidatePath("/list");
}
