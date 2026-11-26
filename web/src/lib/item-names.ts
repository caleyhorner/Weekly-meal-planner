// Gives each shopping item one name, so "kosher salt", "sea salt" and "salt" land on one
// line, and American recipe names become what an Australian supermarket calls them.
// Pure functions. The household's own "same thing as" merges are applied on top of these.
import { unitAtStartOf } from "./units";

/** Words that don't change what you buy. Only stripped from the front of the name. */
const LEADING_NOISE = [
  "fresh", "freshly", "large", "medium", "small", "extra large", "extra-large", "jumbo",
  "good quality", "good-quality", "organic", "free range", "free-range",
  "day-old", "day old", "stale", "crusty", "cubed", "torn", "loaf of", "loaves of",
  "low sodium", "low-sodium", "reduced sodium", "reduced-sodium", "salt-reduced", "salt reduced",
];

/** Exact names (after the steps above) → the one name used on the list. */
const SAME_AS: Record<string, string> = {
  // Salt: whatever kind the recipe asked for, it's one thing on the list.
  "kosher salt": "salt", "sea salt": "salt", "fine salt": "salt", "fine sea salt": "salt",
  "table salt": "salt", "coarse salt": "salt", "coarse sea salt": "salt", "flaky salt": "salt",
  "flaky sea salt": "salt", "sea salt flake": "salt", "salt flake": "salt", "rock salt": "salt",
  "iodised salt": "salt", "iodized salt": "salt", "cooking salt": "salt",
  "diamond crystal kosher salt": "salt", "morton kosher salt": "salt", "flake salt": "salt",
  // Pepper
  pepper: "black pepper", "ground black pepper": "black pepper", "ground pepper": "black pepper",
  "cracked black pepper": "black pepper", "cracked pepper": "black pepper",
  "red pepper flake": "chilli flakes", "crushed red pepper": "chilli flakes",
  "crushed red pepper flake": "chilli flakes", "chili flake": "chilli flakes", "chilli flake": "chilli flakes",
  // Butter, oil, eggs, garlic
  "unsalted butter": "butter", "salted butter": "butter",
  "extra virgin olive oil": "olive oil", "extra-virgin olive oil": "olive oil", evoo: "olive oil",
  "light olive oil": "olive oil",
  "egg yolk": "egg", "egg white": "egg",
  "garlic clove": "garlic", "clove garlic": "garlic", "clove of garlic": "garlic",
  // American → Australian names
  "all-purpose flour": "plain flour", "all purpose flour": "plain flour", "ap flour": "plain flour",
  "self-rising flour": "self-raising flour", "self rising flour": "self-raising flour",
  cornstarch: "cornflour", "corn starch": "cornflour",
  "baking soda": "bicarbonate of soda", "bicarb soda": "bicarbonate of soda",
  "powdered sugar": "icing sugar", "confectioners sugar": "icing sugar",
  "confectioners' sugar": "icing sugar", "confectioner's sugar": "icing sugar",
  "granulated sugar": "white sugar", "superfine sugar": "caster sugar",
  "light brown sugar": "brown sugar", "dark brown sugar": "brown sugar",
  "packed brown sugar": "brown sugar", "packed light brown sugar": "brown sugar",
  "packed dark brown sugar": "brown sugar",
  "heavy cream": "thickened cream", "heavy whipping cream": "thickened cream",
  "whipping cream": "thickened cream",
  cilantro: "coriander", scallion: "spring onion", "green onion": "spring onion",
  "yellow onion": "brown onion",
  "bell pepper": "capsicum", "red bell pepper": "red capsicum", "green bell pepper": "green capsicum",
  "yellow bell pepper": "yellow capsicum",
  "medjool date": "date", "pitted date": "date", "pitted medjool date": "date",
  arugula: "rocket", "baby arugula": "baby rocket", "romaine lettuce": "cos lettuce", romaine: "cos lettuce",
  "ground beef": "beef mince", "ground pork": "pork mince",
  "ground turkey": "turkey mince", "ground chicken": "chicken mince", "ground lamb": "lamb mince",
  "chicken broth": "chicken stock", "beef broth": "beef stock", "vegetable broth": "vegetable stock",
  "turkey broth": "turkey stock",
  "bread cube": "bread", "sourdough loaf": "sourdough bread", "sourdough": "sourdough bread",
  "white bread loaf": "white bread", "bread loaf": "bread", "country bread": "bread",
  "rustic bread": "bread", "italian bread": "bread", "french bread": "baguette",
  "bread crumb": "breadcrumb", "panko bread crumb": "panko breadcrumb",
  "canned pumpkin": "pumpkin puree", "pumpkin purée": "pumpkin puree",
};

/** Cheeses known by name alone, so "feta cheese" and "feta" are one line. */
const NAMED_CHEESES = new Set([
  "feta", "parmesan", "parmigiano reggiano", "parmigiano-reggiano", "pecorino", "pecorino romano",
  "cheddar", "sharp cheddar", "tasty", "mozzarella", "ricotta", "gruyere", "gruyère", "halloumi",
  "mascarpone", "brie", "camembert", "gorgonzola", "manchego", "provolone", "emmental",
  "taleggio", "fontina", "burrata", "bocconcini", "stilton", "gouda", "jarlsberg",
]);

/** Words that look plural but aren't (or read badly made singular). */
const KEEP_AS_IS = new Set([
  "asparagus", "couscous", "hummus", "molasses", "oats", "grits", "greens", "swiss", "citrus",
  "bitters", "schnapps", "jus", "lemongrass", "series", "brussels", "watercress", "cress",
]);

/** Plurals of words that end in "ie": "cookies" → "cookie", not "cooky". */
const IE_WORDS = new Set(["cookies", "brownies", "pies", "veggies", "smoothies", "calories"]);

function singularWord(w: string): string {
  if (KEEP_AS_IS.has(w) || w.length <= 3) return w;
  if (w === "leaves") return "leaf";
  if (IE_WORDS.has(w)) return w.slice(0, -1);
  if (w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (/(oes|ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** One name for one item, without splitting "salt and pepper". */
function canonicalOne(item: string): string {
  let s = item
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // "(optional)", "(about 2 cups)"
    .replace(/\b(optional|to taste|for serving|to serve)\b/g, " ")
    .replace(/[,;].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  // "lbs sweet potatoes" (an amount left in the name): the unit isn't part of the item.
  s = unitAtStartOf(s)?.rest ?? s;

  // Plural last word: "onions" → "onion", "tomatoes" → "tomato".
  const words = s.split(" ");
  words[words.length - 1] = singularWord(words.at(-1)!);
  s = words.join(" ");

  for (let changed = true; changed; ) {
    changed = false;
    for (const w of LEADING_NOISE) {
      if (s.startsWith(`${w} `)) {
        s = s.slice(w.length + 1);
        changed = true;
      }
    }
  }
  // "thyme leaf", "sage leaf" → the herb ("bay leaf" stays: that's what you buy).
  if (/^[a-z]+ leaf$/.test(s) && s !== "bay leaf") s = s.slice(0, -" leaf".length);
  // "thyme sprig", "rosemary sprig" → the herb.
  s = s.replace(/ (sprig|stalk|stem)$/, "");

  // "feta cheese" is feta; "cream cheese" and "blue cheese" are their own things.
  const cheese = s.match(/^(.+) cheese$/);
  if (cheese && NAMED_CHEESES.has(cheese[1])) s = cheese[1];

  return SAME_AS[s] ?? s;
}

/** Things recipes lump together that you buy separately. */
const SEASONINGS = new Set(["salt", "black pepper", "white pepper"]);

/**
 * The name(s) to put on the shopping list for an ingredient. Usually one, but
 * "salt and pepper" becomes ["salt", "black pepper"], and "kosher salt or sea salt" → ["salt"].
 */
export function canonicalItems(item: string): string[] {
  const s = item.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return [];
  const whole = canonicalOne(s);

  const ands = s.split(/\s+(?:and|&)\s+/);
  if (ands.length > 1) {
    const parts = ands.map(canonicalOne);
    if (parts.every((p) => SEASONINGS.has(p))) return [...new Set(parts)];
  }
  const ors = s.split(/\s+or\s+/);
  if (ors.length > 1) {
    const parts = ors.map(canonicalOne);
    if (parts.every((p) => p === parts[0])) return [parts[0]];
  }
  return [whole];
}
