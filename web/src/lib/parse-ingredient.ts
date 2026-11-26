import type { Category, IngredientInput } from "./recipe-model";
import { knownUnit } from "./units";

// Quick parser for ingredients typed by hand on the edit screen
// ("2 tbsp olive oil, for frying"). AI imports don't use this: Claude splits those.

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅛": 0.125,
};

function parseNumber(token: string): number | null {
  const t = token.trim();
  if (t in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[t];
  const mixedUnicode = t.match(/^(\d+)([½⅓⅔¼¾⅛])$/);
  if (mixedUnicode) return Number(mixedUnicode[1]) + UNICODE_FRACTIONS[mixedUnicode[2]];
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Checked in order: the first match wins, so pantry staples such as "chicken stock" or
// "coconut milk" are caught before the meat and dairy words they contain.
const CATEGORY_WORDS: [Category, string[]][] = [
  ["Frozen", ["frozen"]],
  ["Condiments & Sauces", ["sauce", "mustard", "mayo", "ketchup", "vinegar", "pesto", "tahini", "miso", "paste"]],
  ["Pantry", ["stock", "broth", "coconut milk", "coconut cream", "flour", "sugar", "rice", "pasta", "noodle", "oil", "tinned", "canned", "lentil", "chickpea", "cannellini", "kidney bean", "black bean", "oats", "honey", "breadcrumb", "pastry"]],
  ["Spices & Herbs", ["cumin", "paprika", "cinnamon", "turmeric", "oregano", "chilli flakes", "coriander seed", "garam masala", "curry powder", "nutmeg", "bay lea", "dried"]],
  ["Meat & Seafood", ["chicken", "beef", "pork", "lamb", "mince", "bacon", "sausage", "salmon", "fish", "prawn", "tuna", "ham", "chorizo", "steak", "turkey", "pancetta", "prosciutto"]],
  ["Dairy & Eggs", ["egg", "milk", "butter", "cheese", "cream", "yoghurt", "yogurt", "parmesan", "feta", "mozzarella", "ricotta", "halloumi"]],
  ["Bakery", ["bread", "bun", "roll", "wrap", "tortilla", "pita", "naan", "baguette", "sourdough"]],
  ["Produce", ["onion", "garlic", "tomato", "potato", "carrot", "leek", "lemon", "lime", "spinach", "capsicum", "zucchini", "mushroom", "broccoli", "celery", "ginger", "parsley", "coriander", "basil", "mint", "lettuce", "avocado", "apple", "pumpkin", "cucumber", "chilli", "herb", "bean"]],
];

export function guessCategory(item: string): Category {
  const s = item.toLowerCase();
  for (const [cat, words] of CATEGORY_WORDS) if (words.some((w) => s.includes(w))) return cat;
  return "Other";
}

export function parseIngredientLine(raw: string, group: string | null = null): IngredientInput {
  const { amount, unit, rest } = splitLeadingQuantity(raw);
  const [itemPart, ...prepParts] = rest.split(",");
  const item = itemPart.trim().toLowerCase() || raw.trim().toLowerCase();
  const prep = prepParts.join(",").trim() || null;
  return { group, raw: raw.trim(), item, amount, unit, prep, category: guessCategory(item) };
}

/** "1½ tbsp olive oil, to fry" → { amount: 1.5, unit: "tbsp", rest: "olive oil, to fry" } */
export function splitLeadingQuantity(raw: string): {
  amount: number | null;
  unit: string | null;
  rest: string;
} {
  let rest = raw.trim().replace(/\s+/g, " ");
  let amount: number | null = null;
  let unit: string | null = null;

  // Leading quantity: "1 1/2", "1½", "2-3", "200g"
  const qty = rest.match(/^(\d+\s+\d+\/\d+|\d+[½⅓⅔¼¾⅛]|[½⅓⅔¼¾⅛]|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?/);
  if (qty) {
    const first = qty[1].includes(" ")
      ? qty[1].split(" ").reduce((sum, p) => sum + (parseNumber(p) ?? 0), 0)
      : parseNumber(qty[1]);
    const upper = qty[2] ? parseNumber(qty[2]) : null;
    amount = upper ?? first; // ranges: buy for the upper end
    rest = rest.slice(qty[0].length).trim();
    // "fl oz" is two words; every other unit is one ("cups", "tbsp.", "lb").
    const unitMatch =
      rest.match(/^(fl\.?\s*oz)(?:\.|\b)(?:\s+of\b)?\s*/i) ?? rest.match(/^([a-zA-Z]+)(?:\.|\b)(?:\s+of\b)?\s*/);
    const found = unitMatch ? knownUnit(unitMatch[1]) : null;
    if (unitMatch && found) {
      unit = found;
      rest = rest.slice(unitMatch[0].length);
    }
  }
  return { amount, unit, rest: rest.trim() };
}
