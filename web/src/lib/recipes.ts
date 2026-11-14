import "server-only";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { RecipeInput, RecipeKind } from "./recipe-model";

const { recipes, recipeIngredients, recipeSources, planDays, weekSnacks } = schema;

/** Most recent past (or today's) planned date for the recipe. */
const lastCooked = sql<string | null>`(
  select max(d)::text from (
    select ${planDays.date} as d from ${planDays}
    where ${planDays.recipeId} = ${recipes.id}
      and ${planDays.status} = 'recipe'
      and ${planDays.date} <= current_date
    union all
    select ${weekSnacks.weekStart} from ${weekSnacks}
    where ${weekSnacks.recipeId} = ${recipes.id}
      and ${weekSnacks.weekStart} <= current_date
  ) cooked
)`;

export type RecipeSummary = {
  id: string;
  title: string;
  kind: RecipeKind;
  needsReview: boolean;
  servings: number;
  tags: string[];
  heroImageUrl: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  lastCooked: string | null;
};

export type RecipeSort = "lately" | "az";

export async function listRecipes(opts: {
  q?: string;
  tag?: string;
  /** "lately": longest since last cooked first, never-cooked last. */
  sort?: RecipeSort;
  kind?: RecipeKind;
  toCheck?: boolean;
}): Promise<RecipeSummary[]> {
  const where: SQL[] = [];
  const q = opts.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(sql`(
      ${recipes.title} ilike ${like}
      or exists (
        select 1 from ${recipeIngredients}
        where ${recipeIngredients.recipeId} = ${recipes.id}
          and ${recipeIngredients.item} ilike ${like}
      )
    )`);
  }
  if (opts.tag) where.push(sql`${opts.tag} = any(${recipes.tags})`);
  if (opts.kind) where.push(eq(recipes.kind, opts.kind));
  if (opts.toCheck) where.push(eq(recipes.needsReview, true));

  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      kind: recipes.kind,
      needsReview: recipes.needsReview,
      servings: recipes.servings,
      tags: recipes.tags,
      heroImageUrl: recipes.heroImageUrl,
      prepMinutes: recipes.prepMinutes,
      cookMinutes: recipes.cookMinutes,
      lastCooked,
    })
    .from(recipes)
    .where(where.length ? and(...where) : undefined)
    .orderBy(
      ...(opts.sort === "az"
        ? [asc(recipes.title)]
        : [sql`${lastCooked} asc nulls last`, asc(recipes.title)]),
    );
}

export async function listTags(): Promise<string[]> {
  const rows = await db.execute<{ tag: string }>(
    sql`select distinct unnest(${recipes.tags}) as tag from ${recipes} order by tag`,
  );
  return rows.map((r) => r.tag);
}

export async function getRecipe(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [recipe] = await db
    .select({ recipe: recipes, lastCooked })
    .from(recipes)
    .where(eq(recipes.id, id));
  if (!recipe) return null;
  const [ingredients, sources] = await Promise.all([
    db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, id))
      .orderBy(asc(recipeIngredients.position)),
    db
      .select()
      .from(recipeSources)
      .where(eq(recipeSources.recipeId, id))
      .orderBy(asc(recipeSources.position)),
  ]);
  return { ...recipe.recipe, lastCooked: recipe.lastCooked, ingredients, sources };
}
export type FullRecipe = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;

/** Recipes whose title is close to the given one, for duplicate warnings. */
export async function findSimilarTitles(title: string, excludeId?: string) {
  // "Chicken & Leek Pie!" and "chicken and leek pie" count as the same.
  const norm = title.trim().toLowerCase().replaceAll("&", "and").replace(/[^a-z0-9]/g, "");
  if (!norm) return [];
  const rows = await db
    .select({ id: recipes.id, title: recipes.title })
    .from(recipes)
    .where(
      sql`regexp_replace(replace(lower(${recipes.title}), '&', 'and'), '[^a-z0-9]', '', 'g') = ${norm}
        ${excludeId ? sql`and ${recipes.id} <> ${excludeId}` : sql``}`,
    )
    .limit(3);
  return rows;
}

export async function saveRecipe(
  input: RecipeInput,
  id?: string,
  opts: { needsReview?: boolean } = {},
): Promise<string> {
  return db.transaction(async (tx) => {
    const values = {
      title: input.title,
      kind: input.kind,
      description: input.description,
      servings: input.servings,
      prepMinutes: input.prepMinutes,
      cookMinutes: input.cookMinutes,
      tags: [...new Set(input.tags)],
      notes: input.notes,
      steps: input.steps,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceUrl: input.sourceUrl,
      heroImageUrl: input.heroImage,
      // Saving from the edit form counts as checking it.
      needsReview: opts.needsReview ?? false,
      updatedAt: new Date(),
    };
    let recipeId = id;
    if (recipeId) {
      const updated = await tx
        .update(recipes)
        .set(values)
        .where(eq(recipes.id, recipeId))
        .returning({ id: recipes.id });
      if (!updated.length) throw new Error("Recipe not found");
      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
      await tx.delete(recipeSources).where(eq(recipeSources.recipeId, recipeId));
    } else {
      const [row] = await tx.insert(recipes).values(values).returning({ id: recipes.id });
      recipeId = row.id;
    }
    if (input.ingredients.length) {
      await tx.insert(recipeIngredients).values(
        input.ingredients.map((ing, i) => ({
          recipeId: recipeId!,
          position: i,
          groupLabel: ing.group?.trim() || null,
          rawText: ing.raw,
          item: ing.item.trim().toLowerCase(),
          amount: ing.amount,
          unit: ing.unit?.trim() || null,
          prepNote: ing.prep?.trim() || null,
          category: ing.category,
        })),
      );
    }
    if (input.sourceImages.length) {
      await tx
        .insert(recipeSources)
        .values(input.sourceImages.map((url, i) => ({ recipeId: recipeId!, url, position: i })));
    }
    return recipeId!;
  });
}

export async function countToCheck(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(recipes)
    .where(eq(recipes.needsReview, true));
  return row?.n ?? 0;
}

export async function markChecked(id: string) {
  await db.update(recipes).set({ needsReview: false }).where(eq(recipes.id, id));
}

/** A recipe already imported from this link (ignoring tracking bits like ?utm_ and #). */
export async function findBySourceUrl(url: string) {
  const clean = url.trim().replace(/[?#].*$/, "").replace(/\/$/, "");
  if (!clean) return null;
  const [row] = await db
    .select({ id: recipes.id, title: recipes.title })
    .from(recipes)
    .where(sql`regexp_replace(regexp_replace(${recipes.sourceUrl}, '[?#].*$', ''), '/$', '') = ${clean}`)
    .limit(1);
  return row ?? null;
}

export async function deleteRecipe(id: string) {
  await db.delete(recipes).where(eq(recipes.id, id));
}

