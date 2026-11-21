"use server";

import { requireHousehold } from "@/lib/auth";
import { cropDishPhotos, saveWebPicture, searchWebPictures, type WebPicture } from "@/lib/find-pictures";

export type { WebPicture };

function aiError(err: unknown, fallback: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Finding pictures needs the Claude API key, which isn't set up yet. You can still add a photo yourself.";
  }
  console.error("Picture search failed", err);
  return fallback;
}

/** Cuts the photo of the dish out of the recipe's own photos (e.g. a cookbook page). */
export async function cropFromPhotosAction(
  keys: string[],
  title: string,
): Promise<{ keys: string[] } | { error: string }> {
  await requireHousehold();
  const valid = keys.filter((k) => typeof k === "string" && /^recipes\/[\w-]+\.(jpg|png|webp)$/.test(k)).slice(0, 6);
  if (!valid.length) return { keys: [] };
  try {
    return { keys: await cropDishPhotos(valid, String(title).slice(0, 200)) };
  } catch (err) {
    return { error: aiError(err, "Couldn't look through the recipe photos just now.") };
  }
}

/** Looks online for photos of the same dish. */
export async function searchWebPicturesAction(recipe: {
  title: string;
  sourceLabel: string;
  description: string;
  sourceUrl: string | null;
}): Promise<{ pictures: WebPicture[] } | { error: string }> {
  await requireHousehold();
  const title = String(recipe.title ?? "").trim().slice(0, 200);
  if (!title) return { error: "Give the recipe a title first, so there's something to search for." };
  try {
    const pictures = await searchWebPictures({
      title,
      sourceLabel: String(recipe.sourceLabel ?? "").slice(0, 200),
      description: String(recipe.description ?? "").slice(0, 500),
      sourceUrl: typeof recipe.sourceUrl === "string" ? recipe.sourceUrl.slice(0, 500) : null,
    });
    return { pictures };
  } catch (err) {
    return { error: aiError(err, "Couldn't search the web just now. Try again in a minute.") };
  }
}

/** Saves a picture found online so it can be the recipe's picture. */
export async function saveWebPictureAction(imageUrl: string): Promise<{ key: string } | { error: string }> {
  await requireHousehold();
  const key = await saveWebPicture(String(imageUrl));
  return key ? { key } : { error: "That website wouldn't let us copy the picture. Try another." };
}
