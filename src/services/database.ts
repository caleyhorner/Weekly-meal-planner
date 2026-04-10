import * as SQLite from 'expo-sqlite';
import { Recipe, Ingredient, WeekPlan, DayPlan } from '../models/types';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('mealplanner.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      imageUri TEXT,
      sourceUrl TEXT,
      ingredients TEXT NOT NULL DEFAULT '[]',
      instructions TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      dateAdded TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS week_plans (
      id TEXT PRIMARY KEY NOT NULL,
      weekStartDate TEXT NOT NULL UNIQUE,
      days TEXT NOT NULL DEFAULT '{}'
    );
  `);
}

// ─── Recipes ────────────────────────────────────────────────────────────────

export async function getAllRecipes(): Promise<Recipe[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<any>('SELECT * FROM recipes ORDER BY dateAdded DESC');
  return rows.map(deserialiseRecipe);
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<any>('SELECT * FROM recipes WHERE id = ?', [id]);
  return row ? deserialiseRecipe(row) : null;
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO recipes
      (id, title, description, imageUri, sourceUrl, ingredients, instructions, tags, dateAdded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recipe.id,
      recipe.title,
      recipe.description,
      recipe.imageUri ?? null,
      recipe.sourceUrl ?? null,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.instructions),
      JSON.stringify(recipe.tags),
      recipe.dateAdded,
    ]
  );
}

export async function deleteRecipe(id: string): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}

function deserialiseRecipe(row: any): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    imageUri: row.imageUri ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    ingredients: JSON.parse(row.ingredients ?? '[]'),
    instructions: JSON.parse(row.instructions ?? '[]'),
    tags: JSON.parse(row.tags ?? '[]'),
    dateAdded: row.dateAdded,
  };
}

// ─── Week Plans ──────────────────────────────────────────────────────────────

export async function getWeekPlan(weekStartDate: string): Promise<WeekPlan | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM week_plans WHERE weekStartDate = ?',
    [weekStartDate]
  );
  if (!row) return null;
  return {
    id: row.id,
    weekStartDate: row.weekStartDate,
    days: JSON.parse(row.days ?? '{}'),
  };
}

export async function saveWeekPlan(plan: WeekPlan): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO week_plans (id, weekStartDate, days) VALUES (?, ?, ?)`,
    [plan.id, plan.weekStartDate, JSON.stringify(plan.days)]
  );
}
