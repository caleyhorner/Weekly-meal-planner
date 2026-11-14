"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import {
  addAlias,
  addStaple,
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
