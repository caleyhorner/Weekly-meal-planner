"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import { sendToOpenClaw } from "@/lib/openclaw";
import { groceriesText } from "@/lib/shopping";
import {
  addAlias,
  addStaple,
  getShoppingList,
  removeAlias,
  removeStaple,
  setHaveIt,
  setHouseholdSize,
} from "@/lib/shopping-data";
import { isIsoDate } from "@/lib/week";

function refresh() {
  revalidatePath("/list");
  revalidatePath("/settings");
}

function checkItem(item: string) {
  if (typeof item !== "string" || !item.trim() || item.length > 120) throw new Error("Bad item");
}

export async function setHaveItAction(weekStart: string, item: string, haveIt: boolean) {
  await requireHousehold();
  if (!isIsoDate(weekStart)) throw new Error("Bad week");
  checkItem(item);
  await setHaveIt(weekStart, item, haveIt);
  refresh();
}

export async function addStapleAction(item: string) {
  await requireHousehold();
  checkItem(item);
  await addStaple(item);
  refresh();
}

export async function removeStapleAction(item: string) {
  await requireHousehold();
  checkItem(item);
  await removeStaple(item);
  refresh();
}

export async function mergeItemsAction(alias: string, into: string) {
  await requireHousehold();
  checkItem(alias);
  checkItem(into);
  await addAlias(alias, into);
  refresh();
}

export async function removeAliasAction(alias: string) {
  await requireHousehold();
  checkItem(alias);
  await removeAlias(alias);
  refresh();
}

export async function setHouseholdSizeAction(size: number) {
  await requireHousehold();
  if (!Number.isInteger(size) || size < 1 || size > 20) throw new Error("Bad size");
  await setHouseholdSize(size);
  refresh();
  revalidatePath("/");
}

export async function sendToOpenClawAction(weekStart: string) {
  await requireHousehold();
  if (!isIsoDate(weekStart)) throw new Error("Bad week");
  // Rebuild the list on the server from saved ticks, so what's sent matches the database.
  const { items } = await getShoppingList(weekStart);
  const toBuy = items.filter((i) => !i.haveIt);
  if (!toBuy.length) return { ok: false as const, error: "Nothing left to buy this week." };
  return sendToOpenClaw(groceriesText(toBuy), weekStart);
}
