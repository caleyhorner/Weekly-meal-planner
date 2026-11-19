// Ranks website recipes for the "For you" feed. Pure functions, no AI, no database.
//
//   taste    – how alike a suggestion is to recipes you've saved, weighted by how often you cook them
//   shopping – how many of its ingredients are already on this week's shopping list
//   plus a small boost for new posts, and much less weight for things like ones marked "Not for us"

import { parseIngredientLine } from "../parse-ingredient";

const NOISE = new Set([
  "fresh", "large", "small", "medium", "extra", "boneless", "skinless", "finely", "roughly",
  "chopped", "sliced", "diced", "minced", "ground", "grated", "peeled", "crushed", "whole",
  "of", "a", "the", "and", "or", "to", "taste", "serve", "for", "about", "cup", "cups",
]);
/** Too common to say anything about a recipe (matched loosely, so "brown onion" counts as onion). */
const GENERIC = [
  "salt", "pepper", "water", "oil", "sugar", "butter", "garlic", "egg", "flour", "milk", "onion",
];
/** Words that turn an ingredient into a different product: coconut milk is not milk. */
const DIFFERENT_PRODUCT = new Set([
  "coconut", "almond", "soy", "oat", "rice", "peanut", "sour", "cream", "condensed", "evaporated",
  "powder", "paste", "stock", "sauce", "vinegar", "juice", "syrup", "essence", "extract",
]);

function singular(w: string): string {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && /(oes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** "Brown onions (about 2), finely diced" → "brown onion". */
export function itemKey(item: string): string {
  return item
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/,| or /)[0]
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w))
    .map(singular)
    .join(" ")
    .trim();
}

/** Shopping items from a website's ingredient lines. */
export function keysFromLines(lines: string[]): string[] {
  return [...new Set(lines.map((l) => itemKey(parseIngredientLine(l).item)).filter(Boolean))];
}

/** "onion" matches "brown onion"; "chicken thigh" matches "chicken thigh"; "chicken stock" ≠ "chicken". */
export function sameItem(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const sw = short.split(" ");
  const lw = long.split(" ");
  if (sw.at(-1) !== lw.at(-1) || !sw.every((w) => lw.includes(w))) return false;
  return !lw.some((w) => !sw.includes(w) && DIFFERENT_PRODUCT.has(w));
}

/** Items of `a` that are also in `b`, pairing each item at most once and exact names first. */
function overlap(a: string[], b: string[]): string[] {
  const left = new Set(b);
  const found: string[] = [];
  for (const pass of ["exact", "loose"] as const) {
    for (const x of a) {
      if (found.includes(x)) continue;
      const y = [...left].find((y) => (pass === "exact" ? x === y : sameItem(x, y)));
      if (y !== undefined) {
        found.push(x);
        left.delete(y);
      }
    }
  }
  return found;
}

export type Candidate = {
  id: string;
  title: string;
  ingredients: string[];
  sourceName: string;
  publishedAt: Date | null;
};
export type LibraryRecipe = { title: string; items: string[]; timesCooked: number };

export type Scored = { id: string; score: number; reason: string };

export function scoreCandidates(
  candidates: Candidate[],
  opts: {
    library: LibraryRecipe[];
    /** Items on this week's shopping list (already merged). */
    shopping: string[];
    staples: Set<string>;
    /** Ingredient keys of suggestions marked "Not for us". */
    dismissed: string[][];
    now?: Date;
  },
): Scored[] {
  const now = opts.now ?? new Date();
  const skip = [...GENERIC, ...[...opts.staples].map(itemKey)];
  const useful = (keys: string[]) => keys.filter((k) => !skip.some((s) => sameItem(k, s)));
  const library = opts.library
    .map((r) => ({ ...r, keys: useful([...new Set(r.items.map(itemKey).filter(Boolean))]) }))
    .filter((r) => r.keys.length > 0);
  const shopping = useful([...new Set(opts.shopping.map(itemKey).filter(Boolean))]);
  const dismissed = opts.dismissed.map(useful);

  return candidates
    .map((c) => {
      const keys = useful(keysFromLines(c.ingredients));
      if (keys.length === 0) return { id: c.id, score: -1, reason: "" };

      // Taste: the single most similar saved recipe, favouring ones you cook often.
      let best = { sim: 0, weighted: 0, title: "" };
      for (const r of library) {
        const sim = overlap(keys, r.keys).length / Math.sqrt(keys.length * r.keys.length);
        const weighted = sim * (1 + 0.15 * Math.min(r.timesCooked, 6));
        if (weighted > best.weighted) best = { sim, weighted, title: r.title };
      }

      // Shopping: ingredients you're already buying this week.
      const onList = overlap(shopping, keys);
      const shop = 0.12 * Math.min(onList.length, 4);

      // "Not for us": anything closely similar to a dismissed suggestion keeps only 30% of its score.
      const dislike = dismissed.some(
        (d) => d.length && overlap(keys, d).length / Math.sqrt(keys.length * d.length) >= 0.5,
      )
        ? 0.3
        : 1;
      const ageDays = c.publishedAt ? (now.getTime() - c.publishedAt.getTime()) / 86_400_000 : Infinity;
      const fresh = ageDays <= 21 ? 0.05 : 0;

      const reason =
        onList.length >= 2
          ? `Uses ${onList[0]} and ${onList[1]} from this week's list`
          : best.sim >= 0.2
            ? `Like your ${best.title}`
            : onList.length === 1
              ? `Uses ${onList[0]} from this week's list`
              : `New from ${c.sourceName}`;

      return { id: c.id, score: (best.weighted + shop + fresh) * dislike, reason };
    })
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score);
}
