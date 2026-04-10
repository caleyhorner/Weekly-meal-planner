import axios from 'axios';
import { Ingredient } from '../models/types';
import { categoriseIngredient } from '../utils/ingredientCategories';
import uuid from '../utils/uuid';

export interface ParsedRecipe {
  title: string;
  description: string;
  imageUri?: string;
  ingredients: Ingredient[];
  instructions: string[];
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MealPlannerBot/1.0)' },
    timeout: 15000,
  });
  const html = response.data as string;

  // 1. Try JSON-LD schema.org/Recipe (works on most recipe sites)
  const jsonLdResult = tryJsonLd(html);
  if (jsonLdResult) return jsonLdResult;

  // 2. Fallback: regex heuristic
  return tryHtmlHeuristic(html);
}

// ─── JSON-LD extraction (no DOM parser needed) ───────────────────────────────

function tryJsonLd(html: string): ParsedRecipe | null {
  // Extract all <script type="application/ld+json"> blocks
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const schemas = Array.isArray(parsed)
        ? parsed
        : parsed['@graph']
        ? parsed['@graph']
        : [parsed];

      for (const schema of schemas) {
        const type = schema['@type'];
        const isRecipe =
          type === 'Recipe' ||
          (Array.isArray(type) && type.includes('Recipe'));
        if (isRecipe) {
          return extractFromSchema(schema);
        }
      }
    } catch {
      // malformed JSON — skip
    }
  }

  return null;
}

function extractFromSchema(schema: any): ParsedRecipe {
  const rawIngredients: string[] = schema.recipeIngredient ?? [];
  const ingredients = rawIngredients.map((raw) => parseIngredientString(raw));

  const rawInstructions = schema.recipeInstructions ?? [];
  const instructions = flattenInstructions(rawInstructions);

  const image = schema.image;
  let imageUri: string | undefined;
  if (typeof image === 'string') imageUri = image;
  else if (Array.isArray(image) && image.length > 0)
    imageUri = typeof image[0] === 'string' ? image[0] : image[0]?.url;
  else if (image?.url) imageUri = image.url;

  return {
    title: schema.name ?? 'Untitled Recipe',
    description: schema.description ?? '',
    imageUri,
    ingredients,
    instructions,
  };
}

function flattenInstructions(raw: any[]): string[] {
  const steps: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      steps.push(item.trim());
    } else if (item['@type'] === 'HowToStep') {
      steps.push(item.text ?? item.name ?? '');
    } else if (item['@type'] === 'HowToSection') {
      steps.push(...flattenInstructions(item.itemListElement ?? []));
    }
  }
  return steps.filter(Boolean);
}

// ─── HTML heuristic fallback (regex only, no DOM) ───────────────────────────

function tryHtmlHeuristic(html: string): ParsedRecipe {
  // Title: grab first <h1> or <title>
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = stripTags(h1Match?.[1] ?? titleMatch?.[1] ?? 'Untitled Recipe').trim();

  // Ingredients: find <li> items inside a container whose text contains "ingredient"
  const ingredientStrings: string[] = [];
  const ulBlocks = html.match(/<ul[\s\S]*?<\/ul>/gi) ?? [];
  for (const block of ulBlocks) {
    if (/ingredient/i.test(block)) {
      const items = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
      for (const item of items) {
        const text = stripTags(item).trim();
        if (text.length > 1 && text.length < 200) ingredientStrings.push(text);
      }
      if (ingredientStrings.length > 0) break;
    }
  }

  // Fallback: grab all <li> items
  if (ingredientStrings.length === 0) {
    const allLi = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
    for (const item of allLi) {
      const text = stripTags(item).trim();
      if (text.length > 2 && text.length < 200) ingredientStrings.push(text);
    }
  }

  const ingredients = ingredientStrings.slice(0, 40).map((s) => parseIngredientString(s));

  // Instructions: look for ordered list items
  const instructions: string[] = [];
  const olBlocks = html.match(/<ol[\s\S]*?<\/ol>/gi) ?? [];
  for (const block of olBlocks) {
    const items = block.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? [];
    for (const item of items) {
      const text = stripTags(item).trim();
      if (text.length > 10) instructions.push(text);
    }
    if (instructions.length > 0) break;
  }

  return { title, description: '', ingredients, instructions };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Ingredient string parser ────────────────────────────────────────────────

const AMOUNT_UNIT_RE =
  /^([\d½¼¾⅓⅔⅛⅜⅝⅞\s/.,]+)?\s*(cups?|tbsp?|tsp?|tablespoons?|teaspoons?|g|kg|ml|l|lb|oz|litre?s?|pinch|bunch|cloves?|slices?|cans?|tins?|packets?|handful|large|medium|small|whole|fresh)?\s*(.+)$/i;

export function parseIngredientString(raw: string): Ingredient {
  const clean = raw.trim().replace(/\s+/g, ' ');
  const match = clean.match(AMOUNT_UNIT_RE);

  const amount = match?.[1]?.trim() ?? '';
  const unit = match?.[2]?.trim() ?? '';
  const name = match?.[3]?.trim() ?? clean;

  return {
    id: uuid(),
    name,
    amount,
    unit,
    category: categoriseIngredient(name),
  };
}
