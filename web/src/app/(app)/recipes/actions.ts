"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import { recipeInputSchema, type RecipeInput } from "@/lib/recipe-model";
import { deleteRecipe, findSimilarTitles, markChecked, saveRecipe } from "@/lib/recipes";

export type SaveResult = { error: string } | undefined;

export async function saveRecipeAction(input: RecipeInput, id?: string): Promise<SaveResult> {
  await requireHousehold();
  const parsed = recipeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Something in the recipe isn't right" };
  }
  const savedId = await saveRecipe(parsed.data, id);
  revalidatePath("/recipes");
  redirect(`/recipes/${savedId}`);
}

export async function deleteRecipeAction(id: string) {
  await requireHousehold();
  await deleteRecipe(id);
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function similarTitlesAction(title: string, excludeId?: string) {
  await requireHousehold();
  return findSimilarTitles(title, excludeId);
}

export async function markCheckedAction(id: string) {
  await requireHousehold();
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Bad recipe");
  await markChecked(id);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}
