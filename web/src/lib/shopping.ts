// Builds the week's shopping list from planned dinners. Pure functions: no database here.
import { CATEGORIES, type Category } from "./recipe-model";
import { formatQuantity } from "./format";

export type ListInput = {
  item: string;
  amount: number | null;
  unit: string | null;
  category: string;
  recipe: string;
  /** How much of the recipe is being made that night (½, 1, 2, 3…). */
  factor: number;
};

export type ShoppingItem = {
  item: string;
  category: Category;
  /** e.g. ["1.2kg"], ["×3"], ["200g", "1 cup"]; empty when no amount was given. */
  quantities: string[];
  recipes: string[];
};

/** Units we can sum together after converting to a base. */
const BASE: Record<string, { key: string; factor: number; unit: string }> = {
  g: { key: "mass", factor: 1, unit: "g" },
  kg: { key: "mass", factor: 1000, unit: "g" },
  ml: { key: "volume", factor: 1, unit: "ml" },
  l: { key: "volume", factor: 1000, unit: "ml" },
};

/** Things you buy whole: always round up. */
const WHOLE_UNITS = new Set(["can", "sheet", "clove", "bunch", "packet", "slice", "piece", "stalk", "sprig"]);

function normaliseItem(item: string) {
  return item.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildShoppingList(
  lines: ListInput[],
  opts: { aliases: Map<string, string>; staples: Set<string> },
): ShoppingItem[] {
  type Acc = {
    item: string;
    category: Category;
    totals: Map<string, { amount: number; unit: string | null }>;
    recipes: Set<string>;
  };
  const byItem = new Map<string, Acc>();

  for (const line of lines) {
    const raw = normaliseItem(line.item);
    const item = opts.aliases.get(raw) ?? raw;
    if (!item || opts.staples.has(item)) continue;

    let acc = byItem.get(item);
    if (!acc) {
      const category = (CATEGORIES as readonly string[]).includes(line.category)
        ? (line.category as Category)
        : "Other";
      acc = { item, category, totals: new Map(), recipes: new Set() };
      byItem.set(item, acc);
    }
    acc.recipes.add(line.recipe);
    if (line.amount == null) continue;

    const unit = line.unit?.trim().toLowerCase() || null;
    const base = unit ? BASE[unit] : undefined;
    const key = base ? base.key : (unit ?? "count");
    const amount = line.amount * line.factor * (base?.factor ?? 1);
    const prev = acc.totals.get(key);
    acc.totals.set(key, { amount: (prev?.amount ?? 0) + amount, unit: base ? base.unit : unit });
  }

  const order = (c: Category) => CATEGORIES.indexOf(c);
  return [...byItem.values()]
    .map((acc) => ({
      item: acc.item,
      category: acc.category,
      quantities: [...acc.totals.entries()].map(([key, { amount, unit }]) => {
        if (key === "count") return `×${Math.ceil(amount - 1e-9)}`;
        if (unit && WHOLE_UNITS.has(unit)) return formatQuantity(Math.ceil(amount - 1e-9), unit);
        return formatQuantity(amount, unit);
      }),
      recipes: [...acc.recipes],
    }))
    .sort((a, b) => order(a.category) - order(b.category) || a.item.localeCompare(b.item));
}

export function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function itemLine(i: ShoppingItem): string {
  return [capitalise(i.item), i.quantities.join(" + ")].filter(Boolean).join(" ");
}

/** The text pasted into Telegram for OpenClaw to add to the Groceries reminders list. */
export function groceriesText(items: ShoppingItem[]): string {
  return ["Add to Groceries:", ...items.map(itemLine)].join("\n");
}
