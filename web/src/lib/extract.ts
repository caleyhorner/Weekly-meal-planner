import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { CATEGORIES } from "./recipe-model";

// Turns photos / page text / pasted captions into one structured recipe.

export const EXTRACTION_MODEL = process.env.RECIPE_MODEL ?? "claude-opus-5-5";

const ExtractedRecipe = z.object({
  found_recipe: z
    .boolean()
    .describe("false if the input does not contain a recipe (e.g. only a photo of food, or a caption saying 'link in bio')"),
  problem: z
    .string()
    .nullable()
    .describe("If found_recipe is false or the recipe is incomplete, a short plain-English explanation for the user"),
  title: z.string(),
  kind: z
    .enum(["dinner", "snack"])
    .describe("'dinner' for a main meal; 'snack' for snacks, baking, lunchbox treats, dips, bliss balls, muffins and the like"),
  description: z.string().describe("One short sentence from the source, or empty"),
  servings: z.number().int().nullable().describe("Number of servings stated by the source; null if not stated"),
  prep_minutes: z.number().int().nullable(),
  cook_minutes: z.number().int().nullable(),
  ingredients: z.array(
    z.object({
      group: z.string().nullable().describe("Sub-heading such as 'For the sauce', or null"),
      raw: z.string().describe("The ingredient line exactly as written in the source"),
      item: z
        .string()
        .describe("Canonical shopping item: lower case, singular, no prep words or sizes, e.g. 'onion', 'chicken thigh', 'plain flour', 'tinned chopped tomatoes'"),
      amount: z.number().nullable().describe("Numeric quantity (use the upper end of a range); null if none"),
      unit: z
        .string()
        .nullable()
        .describe("One of: g, kg, ml, l, tsp, tbsp, cup, oz, lb, fl oz, stick, pint, quart, clove, can, bunch, sheet, slice, packet, pinch, handful, sprig, stalk, piece; null for a plain count like '2 onions'"),
      prep: z.string().nullable().describe("Preparation or note, e.g. 'finely diced', 'to serve'"),
      category: z.enum(CATEGORIES).describe("Supermarket aisle"),
    }),
  ),
  steps: z.array(z.string()).describe("Method steps in order, in the author's own wording"),
  notes: z.string().describe("Tips, variations or storage notes from the source, or empty"),
  tags: z
    .array(z.string())
    .describe("2-5 short lower-case tags useful for a family dinner planner, e.g. 'quick', 'vegetarian', 'slow cooker', 'pasta', 'chicken', 'oven bake'"),
  source_label: z
    .string()
    .describe("Where it came from: cookbook title and page if visible, author/creator handle, or website name; empty if unknown"),
});
export type ExtractedRecipe = z.infer<typeof ExtractedRecipe>;

const SYSTEM = `You turn recipes from cookbook photos, Instagram captions, screenshots and web pages into structured data for a family's dinner planner.

Be faithful to the source:
- Keep the author's wording for steps and notes. Only fix formatting: split run-on text into separate numbered steps, drop step numbers you add yourself, and join lines broken by page layout.
- Remove social media clutter: emoji, hashtags, "link in bio", "save this for later", follower call-outs, sponsor shout-outs.
- Never invent ingredients, amounts, steps or servings. If the source doesn't state servings, return null.
- Keep every ingredient, including salt, pepper and oil.
- If photos show several pages of one recipe, combine them in reading order. If they show more than one recipe, extract the one that is most complete and mention the others in "problem".
- Convert fractions to decimals for "amount" (1/2 → 0.5). Keep metric and imperial units as written; do not convert between them.
- For "item", give the thing you'd buy, e.g. "2 brown onions, finely diced" → item "brown onion", prep "finely diced". "Juice of 1 lemon" → amount 1, item "lemon", prep "juiced".`;

let client: Anthropic | null = null;
export function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Automatic recipe reading isn't switched on yet (the Claude API key is missing). Use “Type it in myself” for now.",
    );
  }
  client ??= new Anthropic();
  return client;
}

export type ExtractInput = {
  images: { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" }[];
  text: string | null;
};

export async function extractRecipe(input: ExtractInput): Promise<ExtractedRecipe> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  input.images.forEach((img, i) => {
    content.push({ type: "text", text: `Photo ${i + 1}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data.toString("base64") },
    });
  });
  if (input.text) content.push({ type: "text", text: `Source text:\n${input.text}` });
  content.push({ type: "text", text: "Extract the recipe." });

  const response = await anthropic().beta.messages.parse({
    model: EXTRACTION_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ExtractedRecipe) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined to read this one. Try a clearer photo or paste the text.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("The AI couldn't finish reading this recipe. Try fewer photos at once.");
  }
  return response.parsed_output;
}
