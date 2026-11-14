"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import { IMAGE_TYPES, readRecipe } from "@/lib/import";
import { recipeInputSchema } from "@/lib/recipe-model";
import { findBySourceUrl, findSimilarTitles, saveRecipe } from "@/lib/recipes";

export type BulkResult =
  | { status: "saved"; id: string; title: string; note: string | null }
  | { status: "duplicate"; id: string; title: string }
  | { status: "failed"; error: string };

/**
 * Imports one item from the bulk list: a link, or a single photo (one photo = one recipe).
 * Saved straight away and marked "To check" instead of waiting for a review.
 */
export async function bulkImportOneAction(formData: FormData): Promise<BulkResult> {
  await requireHousehold();
  const link = String(formData.get("link") ?? "").trim();
  const photo = formData.get("photo");
  const photos = photo instanceof File && photo.size > 0 ? [photo] : [];
  if (!link && !photos.length) return { status: "failed", error: "Nothing to import." };
  if (photos.some((p) => !IMAGE_TYPES.has(p.type))) {
    return { status: "failed", error: "Photos need to be JPEG, PNG or WebP." };
  }

  if (link) {
    const existing = await findBySourceUrl(link);
    if (existing) return { status: "duplicate", ...existing };
  }

  const res = await readRecipe({ link, pasted: "", photos });
  if (!res.ok) {
    return {
      status: "failed",
      error: res.askForScreenshot ? `${res.error.split(".")[0]}. Add a screenshot of it instead.` : res.error,
    };
  }

  const draft = res.draft;
  const similar = await findSimilarTitles(draft.title);
  if (similar.length) return { status: "duplicate", ...similar[0] };

  let note = res.warning;
  if (!draft.servings) {
    draft.servings = 4;
    note = "The recipe didn't say how many it serves, so it's set to 4. Please check.";
  }
  const parsed = recipeInputSchema.safeParse(draft);
  if (!parsed.success) {
    return { status: "failed", error: parsed.error.issues[0]?.message ?? "The recipe couldn't be read properly." };
  }

  const id = await saveRecipe(parsed.data, undefined, { needsReview: true });
  revalidatePath("/recipes");
  return { status: "saved", id, title: parsed.data.title, note };
}
