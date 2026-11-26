// Turns any recipe unit into grams or millilitres for the shopping list. Pure functions.
//
// Australian measures: cup 250ml, tablespoon 20ml, teaspoon 5ml. American recipes use a
// 240ml cup and 15ml tablespoon, so their spoonfuls come out slightly over: fine for shopping.

/** Every spelling we've seen → one short unit name. */
const UNIT_SYNONYMS: Record<string, string> = {
  g: "g", gm: "g", gms: "g", gr: "g", gram: "g", grams: "g", gramme: "g", grammes: "g",
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  mg: "mg", milligram: "mg", milligrams: "mg",
  ml: "ml", mls: "ml", millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  cl: "cl", dl: "dl",
  l: "l", lt: "l", ltr: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  tsp: "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp", t: "tsp",
  tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup", c: "cup",
  oz: "oz", ozs: "oz", ounce: "oz", ounces: "oz",
  "fl oz": "fl oz", floz: "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  pint: "pint", pints: "pint", pt: "pint",
  quart: "quart", quarts: "quart", qt: "quart",
  gallon: "gallon", gallons: "gallon", gal: "gallon",
  stick: "stick", sticks: "stick",
  pinch: "pinch", pinches: "pinch",
  dash: "dash", dashes: "dash",
  clove: "clove", cloves: "clove",
  can: "can", cans: "can", tin: "can", tins: "can",
  bunch: "bunch", bunches: "bunch",
  sheet: "sheet", sheets: "sheet",
  slice: "slice", slices: "slice",
  packet: "packet", packets: "packet", pack: "packet", packs: "packet", package: "packet", packages: "packet",
  handful: "handful", handfuls: "handful",
  sprig: "sprig", sprigs: "sprig",
  stalk: "stalk", stalks: "stalk",
  piece: "piece", pieces: "piece",
};

/** "Tablespoons", "fl. oz", "lbs." → "tbsp", "fl oz", "lb". Unknown units come back lower-cased. */
export function normaliseUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const u = unit.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (!u) return null;
  // "T" is tablespoon and "t" teaspoon in American recipes; only the raw case tells them apart.
  if (unit.trim() === "T" || unit.trim() === "Tbsp") return "tbsp";
  return UNIT_SYNONYMS[u] ?? u;
}

const KNOWN = new Set(Object.values(UNIT_SYNONYMS));

/** The unit's short name if it's one we know ("Tablespoons" → "tbsp"), else null. */
export function knownUnit(unit: string): string | null {
  const u = normaliseUnit(unit);
  return u && KNOWN.has(u) ? u : null;
}

/** Grams in one of these. */
const MASS: Record<string, number> = { mg: 0.001, g: 1, kg: 1000, oz: 28.35, lb: 453.6 };
/** Millilitres in one of these. */
const VOLUME: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, l: 1000,
  tsp: 5, tbsp: 20, cup: 250,
  "fl oz": 29.57, pint: 473, quart: 946, gallon: 3785,
  pinch: 0.3, dash: 0.6,
};

export type Metric = { amount: number; unit: "g" | "ml" };

/**
 * 2 cup → 500 ml, 1 lb → 453.6 g, 1 stick of butter → 113 g.
 * null for counts, cans, bunches, cinnamon sticks…
 */
export function toMetric(amount: number, unit: string | null, item = ""): Metric | null {
  const u = normaliseUnit(unit);
  if (!u) return null;
  if (u in MASS) return { amount: amount * MASS[u], unit: "g" };
  if (u in VOLUME) return { amount: amount * VOLUME[u], unit: "ml" };
  if (u === "stick" && /\bbutter\b/i.test(item)) return { amount: amount * 113, unit: "g" }; // American sticks
  return null;
}

// How heavy a millilitre of each thing is, so "2 cups flour" can be bought as 300g.
// `buy` says how it's sold: by weight (g) or as a liquid (ml). First match wins, so
// "cream cheese" is found before "cream" and "buttermilk" before "butter".
const DENSITIES: [string[], number, "g" | "ml"][] = [
  [["chocolate chip", "chocolate"], 0.7, "g"],
  [["baking powder", "bicarbonate of soda", "baking soda", "cream of tartar"], 0.9, "g"],
  [["cream cheese", "sour cream", "creme fraiche", "crème fraîche", "mascarpone", "ricotta", "cottage cheese"], 1.0, "g"],
  [["yoghurt", "yogurt"], 1.03, "g"],
  [["peanut butter", "almond butter", "nut butter", "tahini"], 1.05, "g"],
  [["buttermilk"], 1.03, "ml"],
  [["butter", "margarine"], 0.95, "g"],
  [["ghee", "lard", "shortening", "coconut oil"], 0.9, "g"],
  [["oil"], 0.92, "ml"],
  [["evaporated milk", "condensed milk"], 1.3, "ml"],
  [["coconut milk", "coconut cream", "milk", "cream", "half and half"], 1.02, "ml"],
  [["stock", "broth", "water", "wine", "beer", "cider", "juice", "vinegar", "brandy", "rum", "bourbon", "sherry", "port"], 1.0, "ml"],
  [["soy sauce", "fish sauce", "worcestershire", "hot sauce"], 1.1, "ml"],
  [["maple syrup", "golden syrup", "corn syrup", "syrup"], 1.33, "ml"],
  [["honey", "molasses", "treacle"], 1.42, "g"],
  [["extract", "essence"], 0.9, "ml"],
  [["icing sugar", "powdered sugar", "confectioners sugar"], 0.5, "g"],
  [["brown sugar"], 0.9, "g"],
  [["sugar"], 0.85, "g"],
  [["almond meal", "almond flour", "coconut flour"], 0.4, "g"],
  [["cornflour", "cornstarch", "flour"], 0.55, "g"],
  [["cocoa"], 0.45, "g"],
  [["yeast"], 0.6, "g"],
  [["salt"], 1.1, "g"],
  [["panko"], 0.25, "g"],
  [["breadcrumb", "stuffing mix"], 0.45, "g"],
  [["oat"], 0.4, "g"],
  [["rice", "quinoa", "couscous", "lentil", "polenta", "cornmeal", "semolina"], 0.85, "g"],
  [["parmesan", "pecorino", "grated cheese", "shredded cheese", "cheddar", "mozzarella", "gruyere", "gruyère", "cheese"], 0.4, "g"],
  [["pecan", "walnut", "almond", "cashew", "hazelnut", "pistachio", "pine nut", "peanut", "nut"], 0.5, "g"],
  [["dried cranberry", "dried cranberries", "raisin", "sultana", "currant", "dried fruit", "date"], 0.6, "g"],
  [["cranberry", "cranberries", "blueberry", "blueberries", "raspberry", "raspberries", "strawberry", "strawberries", "berry", "berries"], 0.6, "g"],
  [["pumpkin puree", "pumpkin purée", "puree", "purée", "mashed potato", "applesauce", "apple sauce", "tomato paste", "jam", "mayonnaise", "mayo", "mustard", "pesto"], 1.0, "g"],
  [["pepper", "cinnamon", "nutmeg", "ginger", "allspice", "clove", "cumin", "paprika", "turmeric", "coriander", "chilli", "chili", "cayenne", "garam masala", "curry powder", "mixed spice", "pumpkin spice", "spice", "seed"], 0.5, "g"],
  [["dried", "thyme", "sage", "rosemary", "oregano", "basil", "parsley", "dill", "mint", "chive", "tarragon", "herb"], 0.2, "g"],
  [["pea", "corn", "bean"], 0.65, "g"],
  [["onion", "celery", "carrot", "capsicum", "mushroom", "potato", "sweet potato", "pumpkin", "apple", "pear", "leek", "shallot", "zucchini", "spinach", "kale", "cabbage", "lettuce", "tomato"], 0.55, "g"],
];

/**
 * Keywords match whole words (plurals allowed), so "salt" doesn't match "unsalted" and
 * "butter" doesn't match "butternut pumpkin".
 */
const DENSITY_PATTERNS = DENSITIES.map(([words, density, buy]) => ({
  re: new RegExp(`(^|[^a-zà-ÿ])(${words.join("|")})(s|es)?($|[^a-zà-ÿ])`, "i"),
  density,
  buy,
}));

/** How a millilitre of this item weighs and how it's bought, or null if we don't know. */
export function densityOf(item: string): { density: number; buy: "g" | "ml" } | null {
  for (const p of DENSITY_PATTERNS) if (p.re.test(item)) return { density: p.density, buy: p.buy };
  return null;
}
