import { Share } from 'react-native';
import { Recipe, Ingredient, IngredientCategory, ALL_CATEGORIES, WeekPlan } from '../models/types';
import { formatShortDate } from '../utils/dates';

export interface ShoppingCategory {
  category: IngredientCategory;
  items: Ingredient[];
}

export function buildShoppingList(
  plan: WeekPlan,
  recipes: Recipe[]
): ShoppingCategory[] {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const allIngredients: Ingredient[] = [];

  Object.values(plan.days).forEach((day) => {
    if (day.status === 'skip' || !day.recipeId) return;
    const recipe = recipeMap.get(day.recipeId);
    if (!recipe) return;
    allIngredients.push(...recipe.ingredients);
  });

  const grouped: Record<IngredientCategory, Ingredient[]> = {} as any;
  ALL_CATEGORIES.forEach((cat) => (grouped[cat] = []));

  allIngredients.forEach((ing) => {
    grouped[ing.category].push(ing);
  });

  return ALL_CATEGORIES.filter((cat) => grouped[cat].length > 0).map((cat) => ({
    category: cat,
    items: grouped[cat],
  }));
}

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  Produce: '🥦',
  'Meat & Seafood': '🥩',
  'Dairy & Eggs': '🥛',
  Pantry: '🥫',
  Frozen: '❄️',
  Bakery: '🍞',
  Beverages: '🥤',
  Condiments: '🫙',
  'Spices & Herbs': '🌿',
  Other: '🛍️',
};

export function formatShoppingListText(
  categories: ShoppingCategory[],
  weekStartDate: string
): string {
  const header = `Shopping List – Week of ${formatShortDate(weekStartDate)}\n${'─'.repeat(36)}\n`;

  const body = categories
    .map((cat) => {
      const emoji = CATEGORY_EMOJI[cat.category];
      const heading = `${emoji} ${cat.category}`;
      const lines = cat.items
        .map((ing) => {
          const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
          return `• ${parts.join(' ')}`;
        })
        .join('\n');
      return `${heading}\n${lines}`;
    })
    .join('\n\n');

  return header + body;
}

export async function exportShoppingList(text: string): Promise<void> {
  await Share.share({ message: text, title: 'Shopping List' });
}
