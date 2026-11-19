"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import { addSource, checkSource, getCandidate, removeSource, setCandidateStatus } from "@/lib/feed/data";
import { readRecipe } from "@/lib/import";
import { addWeekSnack, setDayRecipe } from "@/lib/plan";
import { recipeInputSchema } from "@/lib/recipe-model";
import { findBySourceUrl, saveRecipe } from "@/lib/recipes";
import { dayName, isIsoDate, weekStartFor } from "@/lib/week";

const UUID = /^[0-9a-f-]{36}$/i;

type Saved = { ok: true; recipeId: string; title: string; kind: "dinner" | "snack" } | { ok: false; error: string };

/** Imports a suggested website recipe into the household's recipes (marked "To check"). */
async function saveSuggestion(id: string): Promise<Saved> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown suggestion." };
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, error: "That suggestion has gone." };

  const existing = await findBySourceUrl(candidate.url);
  if (existing) {
    await setCandidateStatus(id, "saved");
    return { ok: true, recipeId: existing.id, title: existing.title, kind: "dinner" };
  }
  const res = await readRecipe({ link: candidate.url, pasted: "", photos: [] });
  if (!res.ok) return { ok: false, error: res.error };
  const draft = { ...res.draft, servings: res.draft.servings || 4 };
  const parsed = recipeInputSchema.safeParse(draft);
  if (!parsed.success) return { ok: false, error: "The recipe couldn't be read properly." };
  const recipeId = await saveRecipe(parsed.data, undefined, { needsReview: true });
  await setCandidateStatus(id, "saved");
  return { ok: true, recipeId, title: parsed.data.title, kind: parsed.data.kind };
}

export async function saveSuggestionAction(id: string): Promise<Saved> {
  await requireHousehold();
  const res = await saveSuggestion(id);
  revalidatePath("/recipes");
  return res;
}

/** Saves the suggestion and puts it on a night (or that week's snacks, if it's a snack). */
export async function planSuggestionAction(id: string, date: string): Promise<Saved & { message?: string }> {
  await requireHousehold();
  if (!isIsoDate(date)) return { ok: false, error: "Pick a day." };
  const res = await saveSuggestion(id);
  if (!res.ok) return res;
  if (res.kind === "snack") {
    await addWeekSnack(weekStartFor(date), res.recipeId);
  } else {
    await setDayRecipe(date, res.recipeId);
  }
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/list");
  return {
    ...res,
    message: res.kind === "snack" ? "Added to that week's snacks" : `Planned for ${dayName(date)}`,
  };
}

export async function dismissSuggestionAction(id: string) {
  await requireHousehold();
  if (!UUID.test(id)) return;
  await setCandidateStatus(id, "dismissed");
  revalidatePath("/recipes");
}

// ─── Websites (Settings) ────────────────────────────────────────────────────

export async function addSourceAction(url: string) {
  await requireHousehold();
  const res = await addSource(url);
  revalidatePath("/settings");
  revalidatePath("/recipes");
  return res;
}

export async function removeSourceAction(id: string) {
  await requireHousehold();
  if (!UUID.test(id)) return;
  await removeSource(id);
  revalidatePath("/settings");
  revalidatePath("/recipes");
}

export async function checkSourceAction(id: string) {
  await requireHousehold();
  if (!UUID.test(id)) return null;
  const res = await checkSource(id);
  revalidatePath("/settings");
  revalidatePath("/recipes");
  return res;
}
