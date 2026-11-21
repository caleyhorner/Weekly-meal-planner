"use server";

import { requireHousehold } from "@/lib/auth";
import { IMAGE_TYPES, readRecipe, type ImportResult } from "@/lib/import";

export type { ImportResult };

const MAX_PHOTOS = 6;

export async function importRecipeAction(formData: FormData): Promise<ImportResult> {
  await requireHousehold();

  const link = String(formData.get("link") ?? "").trim();
  const pasted = String(formData.get("text") ?? "").trim();
  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!link && !pasted && photos.length === 0) {
    return { ok: false, error: "Add a link, some text or a photo first.", askForScreenshot: false };
  }
  if (photos.length > MAX_PHOTOS) {
    return { ok: false, error: `Up to ${MAX_PHOTOS} photos at a time, please.`, askForScreenshot: false };
  }
  if (photos.some((p) => !IMAGE_TYPES.has(p.type))) {
    return { ok: false, error: "Photos need to be JPEG, PNG or WebP.", askForScreenshot: false };
  }

  return readRecipe({ link, pasted, photos });
}
