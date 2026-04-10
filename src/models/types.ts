export type IngredientCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Pantry'
  | 'Frozen'
  | 'Bakery'
  | 'Beverages'
  | 'Condiments'
  | 'Spices & Herbs'
  | 'Other';

export const ALL_CATEGORIES: IngredientCategory[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Pantry',
  'Frozen',
  'Bakery',
  'Beverages',
  'Condiments',
  'Spices & Herbs',
  'Other',
];

export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: IngredientCategory;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUri?: string;
  sourceUrl?: string;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  dateAdded: string;
}

export type DayStatus = 'planned' | 'skip';

export interface DayPlan {
  date: string; // ISO "YYYY-MM-DD"
  recipeId: string | null;
  status: DayStatus;
}

export interface WeekPlan {
  id: string;
  weekStartDate: string; // Saturday's ISO date
  days: Record<string, DayPlan>; // keyed by ISO date
}
