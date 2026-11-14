import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  date,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const SOURCE_TYPES = ["book", "instagram", "web", "text"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  servings: integer("servings").notNull(),
  prepMinutes: integer("prep_minutes"),
  cookMinutes: integer("cook_minutes"),
  tags: text("tags").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
  steps: jsonb("steps").$type<string[]>().notNull().default([]),
  sourceType: text("source_type").$type<SourceType>().notNull(),
  sourceLabel: text("source_label").notNull().default(""),
  sourceUrl: text("source_url"),
  heroImageUrl: text("hero_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    groupLabel: text("group_label"),
    rawText: text("raw_text").notNull(),
    /** Canonical shopping item, lower case, e.g. "onion". */
    item: text("item").notNull(),
    amount: doublePrecision("amount"),
    unit: text("unit"),
    prepNote: text("prep_note"),
    category: text("category").notNull().default("Other"),
  },
  (t) => [index("recipe_ingredients_recipe_idx").on(t.recipeId)],
);

/** Original photos/screenshots a recipe was imported from ("View original"). */
export const recipeSources = pgTable("recipe_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

export const itemAliases = pgTable("item_aliases", {
  alias: text("alias").primaryKey(),
  item: text("item").notNull(),
});

export const staples = pgTable("staples", {
  item: text("item").primaryKey(),
});

export const householdSettings = pgTable("household_settings", {
  id: integer("id").primaryKey().default(1),
  householdSize: integer("household_size").notNull().default(4),
});

export const planDays = pgTable("plan_days", {
  date: date("date").primaryKey(),
  recipeId: uuid("recipe_id").references(() => recipes.id, { onDelete: "set null" }),
  status: text("status").$type<"recipe" | "skip">().notNull().default("recipe"),
  servingsOverride: integer("servings_override"),
});

export const shoppingHaveIt = pgTable(
  "shopping_have_it",
  {
    weekStart: date("week_start").notNull(),
    item: text("item").notNull(),
    haveIt: boolean("have_it").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.weekStart, t.item] })],
);

export type Recipe = typeof recipes.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
