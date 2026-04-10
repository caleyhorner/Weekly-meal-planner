import axios from 'axios';
import * as cheerio from 'cheerio';
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
  const $ = cheerio.load(html);

  // 1. Try JSON-LD schema.org/Recipe
  const jsonLdResult = tryJsonLd($, url);
  if (jsonLdResult) return jsonLdResult;

  // 2. Fallback: heuristic HTML parsing
  return tryHtmlHeuristic($, url);
}

function tryJsonLd($: ReturnType<typeof cheerio.load>, url: string): ParsedRecipe | null {
  let result: ParsedRecipe | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (result) return;
    try {
      const raw = $(el).html() ?? '';
      const parsed = JSON.parse(raw);
      const schemas = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];

      for (const schema of schemas) {
        if (schema['@type'] === 'Recipe' || schema['@type']?.includes?.('Recipe')) {
          result = extractFromSchema(schema);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
  });

  return result;
}

function extractFromSchema(schema: any): ParsedRecipe {
  const rawIngredients: string[] = schema.recipeIngredient ?? [];
  const ingredients = rawIngredients.map((raw) => parseIngredientString(raw));

  const rawInstructions = schema.recipeInstructions ?? [];
  const instructions = flattenInstructions(rawInstructions);

  const image = schema.image;
  let imageUri: string | undefined;
  if (typeof image === 'string') imageUri = image;
  else if (Array.isArray(image) && image.length > 0) imageUri = typeof image[0] === 'string' ? image[0] : image[0]?.url;
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
      const sectionSteps = flattenInstructions(item.itemListElement ?? []);
      steps.push(...sectionSteps);
    }
  }
  return steps.filter(Boolean);
}

function tryHtmlHeuristic($: ReturnType<typeof cheerio.load>, url: string): ParsedRecipe {
  const title = $('h1').first().text().trim() || $('title').text().trim() || 'Untitled Recipe';

  // Find ingredients: look for lists near "ingredient" headings
  const ingredientStrings: string[] = [];
  $('*').each((_, el) => {
    const text = $(el).text().toLowerCase();
    if (text.includes('ingredient') && $(el).is('h2,h3,h4,li,p,span,div')) {
      const parent = $(el).parent();
      parent.find('li').each((_, li) => {
        const t = $(li).text().trim();
        if (t) ingredientStrings.push(t);
      });
    }
  });

  // Fallback: grab all list items
  if (ingredientStrings.length === 0) {
    $('ul li').each((_, li) => {
      const t = $(li).text().trim();
      if (t.length > 2 && t.length < 200) ingredientStrings.push(t);
    });
  }

  const ingredients = ingredientStrings.slice(0, 40).map((s) => parseIngredientString(s));

  // Find instructions
  const instructions: string[] = [];
  $('ol li, .instructions li, [class*="step"] p, [class*="instruction"] p').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 10) instructions.push(t);
  });

  return { title, description: '', ingredients, instructions };
}

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
