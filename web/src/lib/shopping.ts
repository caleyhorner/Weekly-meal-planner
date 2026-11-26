// Builds the week's shopping list from planned dinners. Pure functions: no database here.
import { CATEGORIES, type Category } from "./recipe-model";
import { formatQuantity } from "./format";
import { canonicalItems } from "./item-names";
import { splitLeadingQuantity } from "./parse-ingredient";
import { densityOf, knownUnit, normaliseUnit, sizeInText, toMetric, unitAtStartOf } from "./units";

export type ListInput = {
  item: string;
  amount: number | null;
  unit: string | null;
  category: string;
  recipe: string;
  /** How much of the recipe is being made that night (½, 1, 2, 3…). */
  factor: number;
  /** The ingredient line as the recipe wrote it, for amounts the stored unit missed. */
  raw?: string;
};

export type ShoppingItem = {
  item: string;
  category: Category;
  /** In grams or millilitres where possible, e.g. ["1.2kg"], ["×3"], ["400g", "1 can"]; empty when no amount was given. */
  quantities: string[];
  recipes: string[];
};

/** Things you buy whole: always round up. */
const WHOLE_UNITS = new Set(["can", "sheet", "clove", "bunch", "packet", "slice", "piece", "stalk", "sprig", "handful", "stick"]);

/**
 * Grams or millilitres, rounded up so there's always enough: 3g, 45g, 340g, then kg / L
 * from 1000 (1.34kg, 2.5 L).
 */
export function formatMetric(amount: number, unit: "g" | "ml"): string {
  const up = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;
  if (amount >= 1000) {
    const big = up(amount, 10) / 1000;
    return unit === "g" ? `${big}kg` : `${big} L`;
  }
  const n = amount < 100 ? Math.max(1, up(amount, 1)) : up(amount, 5);
  return `${n}${unit}`;
}

function normaliseItem(item: string) {
  return item.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Each ingredient's name(s) on the list: the household's own merges win over built-in ones. */
function namesFor(item: string, aliases: Map<string, string>): string[] {
  const raw = normaliseItem(item);
  if (!raw) return [];
  const own = aliases.get(raw);
  if (own) return [own];
  return [...new Set(canonicalItems(raw).map((n) => aliases.get(n) ?? n))];
}

export function buildShoppingList(
  lines: ListInput[],
  opts: { aliases: Map<string, string>; staples: Set<string> },
): ShoppingItem[] {
  type Acc = {
    item: string;
    category: Category;
    /** "g", "ml", another unit ("can", "bunch"), or "count" for plain numbers. */
    totals: Map<string, number>;
    recipes: Set<string>;
  };
  const byItem = new Map<string, Acc>();
  const isStaple = (raw: string, item: string) => opts.staples.has(item) || opts.staples.has(normaliseItem(raw));

  for (const line of lines) {
    for (const item of namesFor(line.item, opts.aliases)) {
      if (isStaple(line.item, item)) continue;

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

      const { key, amount } = quantityOf(line, item);
      acc.totals.set(key, (acc.totals.get(key) ?? 0) + amount);
    }
  }

  const order = (c: Category) => CATEGORIES.indexOf(c);
  return [...byItem.values()]
    .map((acc) => {
      // Cups and spoons of flour become grams; grams of stock become millilitres.
      const t = acc.totals;
      const d = densityOf(acc.item);
      if (d && d.buy === "g" && t.has("ml")) {
        t.set("g", (t.get("g") ?? 0) + t.get("ml")! * d.density);
        t.delete("ml");
      } else if (d && d.buy === "ml" && t.has("g")) {
        t.set("ml", (t.get("ml") ?? 0) + t.get("g")! / d.density);
        t.delete("g");
      } else if (!d && t.has("ml") && !LIQUID_AISLES.has(acc.category)) {
        // Cups of something we don't know (marshmallows, croutons): you buy it by weight,
        // so give a rough weight rather than millilitres.
        t.set("g", (t.get("g") ?? 0) + t.get("ml")! * UNKNOWN_DENSITY);
        t.delete("ml");
      }
      const keys = [...t.keys()].sort((a, b) => rank(a) - rank(b));
      return {
        item: acc.item,
        category: acc.category,
        quantities: keys.map((key) => {
          const amount = t.get(key)!;
          if (key === "g" || key === "ml") return formatMetric(amount, key);
          if (key === "count") return `×${Math.ceil(amount - 1e-9)}`;
          if (WHOLE_UNITS.has(key)) return formatQuantity(Math.ceil(amount - 1e-9), key);
          return formatQuantity(amount, key);
        }),
        recipes: [...acc.recipes],
      };
    })
    .sort((a, b) => order(a.category) - order(b.category) || a.item.localeCompare(b.item));
}

/** Aisles where an unknown item measured in cups is probably a liquid. */
const LIQUID_AISLES = new Set<Category>(["Drinks", "Condiments & Sauces", "Dairy & Eggs"]);
/** Grams per millilitre for dry things we have no figure for. */
const UNKNOWN_DENSITY = 0.5;

/** Units you'd buy a number of, where the line may say how big each one is. */
const PACKS = new Set(["can", "packet", "piece"]);

/**
 * One line's amount in grams or millilitres where at all possible, falling back to the
 * recipe's own wording when the stored unit is missing or odd:
 *   unit "cups, packed"                   → ml
 *   item "lbs sweet potatoes", no unit    → g
 *   "2 (15-ounce) cans pumpkin puree"     → 2 × 425 g
 *   "1 (12 to 14 lb) turkey"              → 6.35 kg
 */
function quantityOf(line: ListInput, item: string): { key: string; amount: number } {
  const amount = line.amount! * line.factor;
  const unit = normaliseUnit(line.unit);
  const direct = toMetric(amount, unit, item);
  if (direct) return { key: direct.unit, amount: direct.amount };

  const known = unit == null || knownUnit(unit) != null;
  if (!known || unit == null) {
    // The unit may have ended up in the name, or only the original line has it.
    const fromName = unitAtStartOf(line.item);
    const m = fromName && toMetric(amount, fromName.unit, item);
    if (m) return { key: m.unit, amount: m.amount };
    if (line.raw) {
      const lead = splitLeadingQuantity(line.raw);
      const r = lead.amount != null && lead.unit ? toMetric(lead.amount * line.factor, lead.unit, item) : null;
      if (r) return { key: r.unit, amount: r.amount };
    }
  }
  if (unit == null || PACKS.has(unit)) {
    const size = line.raw ? sizeInText(line.raw) : null;
    // Australian cans and packs are labelled in grams: use them. Counted things ("1 onion
    // (about 200g)") stay counted unless the size is in pounds or ounces.
    if (size && (unit != null || size.imperial)) {
      return { key: size.metric.unit, amount: amount * size.metric.amount };
    }
  }
  return { key: unit ?? "count", amount };
}

/** Weights and volumes first, then counts, then cans, bunches and the like. */
function rank(key: string) {
  return key === "g" || key === "ml" ? 0 : key === "count" ? 1 : 2;
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
