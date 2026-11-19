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

export const RECIPE_KINDS = ["dinner", "snack"] as const;
export type RecipeKind = (typeof RECIPE_KINDS)[number];
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  kind: text("kind").$type<RecipeKind>().notNull().default("dinner"),
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
  /** Saved by bulk import without a review; shown under "To check" until confirmed. */
  needsReview: boolean("needs_review").notNull().default(false),
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
  /** Chosen scale for this meal (½, 1, 2 or 3); null = the household rule decides. */
  multiplier: doublePrecision("multiplier"),
});

/** Snacks to make in a given week (not tied to a day). */
export const weekSnacks = pgTable(
  "week_snacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekStart: date("week_start").notNull(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    /** Batches: ½, 1, 2 or 3 times the recipe as written. */
    multiplier: doublePrecision("multiplier").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("week_snacks_week_idx").on(t.weekStart)],
);

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

// ─── Recipe feed ("For you") ─────────────────────────────────────────────────

/** Recipe websites the household follows. */
export const feedSources = pgTable("feed_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  siteUrl: text("site_url").notNull().unique(),
  /** RSS/Atom feed of new posts, found automatically. */
  feedUrl: text("feed_url"),
  /** Sitemap listing recipe pages, used when there is no feed (and to fill the feed at first). */
  sitemapUrl: text("sitemap_url"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Recipes found on those websites, waiting to be suggested. */
export const feedCandidates = pgTable(
  "feed_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => feedSources.id, { onDelete: "cascade" }),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    imageUrl: text("image_url"),
    /** Ingredient lines exactly as the website lists them. */
    ingredients: text("ingredients").array().notNull().default([]),
    keywords: text("keywords").array().notNull().default([]),
    totalMinutes: integer("total_minutes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** new = can be suggested; saved = imported; dismissed = "Not for us"; skipped = page wasn't a recipe. */
    status: text("status").$type<"new" | "saved" | "dismissed" | "skipped">().notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feed_candidates_status_idx").on(t.status)],
);
