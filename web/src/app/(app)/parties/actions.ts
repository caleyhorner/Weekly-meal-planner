"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireHousehold } from "@/lib/auth";
import { sendToOpenClaw } from "@/lib/openclaw";
import {
  addDish,
  createParty,
  deleteParty,
  getParty,
  getPartyShoppingList,
  MAX_GUESTS,
  removeDish,
  setDishMultiplier,
  setPartyHaveIt,
  updateParty,
} from "@/lib/parties";
import { MULTIPLIERS } from "@/lib/scaling";
import { groceriesText } from "@/lib/shopping";
import { isIsoDate } from "@/lib/week";

const UUID = /^[0-9a-f-]{36}$/i;

function checkId(id: string) {
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Bad id");
}

function refresh(partyId?: string) {
  revalidatePath("/parties");
  if (partyId) revalidatePath(`/parties/${partyId}`, "layout");
}

export type PartyFormState = { error: string } | undefined;

/** Name, date and guest count from the new-party and edit forms. */
function readDetails(formData: FormData): { name: string; date: string | null; guests: number } | { error: string } {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const rawDate = String(formData.get("date") ?? "").trim();
  const guests = Number(formData.get("guests"));
  if (!name) return { error: "Give the party a name, e.g. “Sam's birthday”." };
  if (rawDate && !isIsoDate(rawDate)) return { error: "That date doesn't look right." };
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
    return { error: `How many people are eating? (1 to ${MAX_GUESTS})` };
  }
  return { name, date: rawDate || null, guests };
}

export async function createPartyAction(_prev: PartyFormState, formData: FormData): Promise<PartyFormState> {
  await requireHousehold();
  const details = readDetails(formData);
  if ("error" in details) return details;
  const id = await createParty(details);
  refresh();
  redirect(`/parties/${id}`);
}

export async function updatePartyAction(id: string, _prev: PartyFormState, formData: FormData): Promise<PartyFormState> {
  await requireHousehold();
  checkId(id);
  const details = readDetails(formData);
  if ("error" in details) return details;
  await updateParty(id, details);
  refresh(id);
}

export async function deletePartyAction(id: string) {
  await requireHousehold();
  checkId(id);
  await deleteParty(id);
  refresh();
  redirect("/parties");
}

export async function addDishAction(partyId: string, recipeId: string) {
  await requireHousehold();
  checkId(partyId);
  checkId(recipeId);
  await addDish(partyId, recipeId);
  refresh(partyId);
}

export async function removeDishAction(partyId: string, dishId: string) {
  await requireHousehold();
  checkId(partyId);
  checkId(dishId);
  await removeDish(partyId, dishId);
  refresh(partyId);
}

export async function setDishMultiplierAction(partyId: string, dishId: string, multiplier: number | null) {
  await requireHousehold();
  checkId(partyId);
  checkId(dishId);
  if (multiplier !== null && !(MULTIPLIERS as readonly number[]).includes(multiplier)) {
    throw new Error("Bad size");
  }
  await setDishMultiplier(partyId, dishId, multiplier);
  refresh(partyId);
}

export async function setPartyHaveItAction(partyId: string, item: string, haveIt: boolean) {
  await requireHousehold();
  checkId(partyId);
  if (typeof item !== "string" || !item.trim() || item.length > 120) throw new Error("Bad item");
  await setPartyHaveIt(partyId, item, haveIt);
  revalidatePath(`/parties/${partyId}/list`);
}

export async function sendPartyListAction(partyId: string) {
  await requireHousehold();
  checkId(partyId);
  const party = await getParty(partyId);
  if (!party) return { ok: false as const, error: "That party has been deleted." };
  // Rebuild the list on the server from saved ticks, so what's sent matches the database.
  const toBuy = (await getPartyShoppingList(party)).filter((i) => !i.haveIt);
  if (!toBuy.length) return { ok: false as const, error: "Nothing left to buy for this party." };
  return sendToOpenClaw(groceriesText(toBuy), `party:${partyId}`);
}
