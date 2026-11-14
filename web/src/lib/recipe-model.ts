import { z } from "zod";

// Shared between the browser (review/edit form) and the server (save, AI extraction).

export const CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Spices & Herbs",
  "Condiments & Sauces",
  "Frozen",
  "Drinks",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Units the app understands for scaling and merging. null = a plain count ("2 onions"). */
export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "clove",
  "can",
  "bunch",
  "sheet",
  "slice",
  "packet",
  "pinch",
  "handful",
  "sprig",
  "stalk",
  "piece",
] as const;

export const ingredientSchema = z.object({
  group: z.string().nullable(),
  raw: z.string(),
  item: z.string().min(1),
  amount: z.number().positive().nullable(),
  unit: z.string().nullable(),
  prep: z.string().nullable(),
  category: z.enum(CATEGORIES),
});
export type IngredientInput = z.infer<typeof ingredientSchema>;

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1, "Give the recipe a title"),
  description: z.string(),
  servings: z.number().int().min(1, "How many does it serve?").max(50),
  prepMinutes: z.number().int().min(0).nullable(),
  cookMinutes: z.number().int().min(0).nullable(),
  tags: z.array(z.string().trim().toLowerCase().min(1)),
  notes: z.string(),
  steps: z.array(z.string().trim().min(1)),
  ingredients: z.array(ingredientSchema),
  sourceType: z.enum(["book", "instagram", "web", "text"]),
  sourceLabel: z.string(),
  sourceUrl: z.string().nullable(),
  /** Image keys from storage: originals ("View original") and optional cover. */
  sourceImages: z.array(z.string()),
  heroImage: z.string().nullable(),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export function emptyRecipe(): RecipeInput {
  return {
    title: "",
    description: "",
    servings: 4,
    prepMinutes: null,
    cookMinutes: null,
    tags: [],
    notes: "",
    steps: [],
    ingredients: [],
    sourceType: "text",
    sourceLabel: "",
    sourceUrl: null,
    sourceImages: [],
    heroImage: null,
  };
}
