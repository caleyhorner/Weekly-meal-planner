import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { householdToday } from "../plan";
import { getShoppingList, listStaples } from "../shopping-data";
import { weekStartFor } from "../week";
import { keysFromLines, scoreCandidates } from "./score";
import { refreshSource, siteName } from "./refresh";

const { feedSources, feedCandidates, recipes, recipeIngredients, planDays, weekSnacks } = schema;

export type Suggestion = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  totalMinutes: number | null;
  sourceName: string;
  reason: string;
};

const normUrl = (u: string) => u.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();

/** The "For you" suggestions: the best few website recipes for this household right now. */
export async function getFeed(limit = 10): Promise<{ suggestions: Suggestion[]; sources: number; waiting: number }> {
  const thisWeek = weekStartFor(await householdToday());
  const [candidates, library, cooked, list, staples, dismissedRows, saved, sourceCount] = await Promise.all([
    db
      .select({
        id: feedCandidates.id,
        title: feedCandidates.title,
        url: feedCandidates.url,
        imageUrl: feedCandidates.imageUrl,
        ingredients: feedCandidates.ingredients,
        totalMinutes: feedCandidates.totalMinutes,
        publishedAt: feedCandidates.publishedAt,
        sourceName: feedSources.name,
      })
      .from(feedCandidates)
      .innerJoin(feedSources, eq(feedCandidates.sourceId, feedSources.id))
      .where(eq(feedCandidates.status, "new"))
      .orderBy(desc(feedCandidates.createdAt))
      .limit(400),
    db
      .select({ id: recipes.id, title: recipes.title, item: recipeIngredients.item })
      .from(recipes)
      .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id)),
    // How often each recipe has been planned (dinners and snack weeks).
    db.execute<{ recipe_id: string; n: number }>(sql`
      select recipe_id, count(*)::int as n from (
        select ${planDays.recipeId} as recipe_id from ${planDays} where ${planDays.recipeId} is not null
        union all
        select ${weekSnacks.recipeId} from ${weekSnacks}
      ) t group by recipe_id`),
    getShoppingList(thisWeek),
    listStaples(),
    db
      .select({ ingredients: feedCandidates.ingredients })
      .from(feedCandidates)
      .where(eq(feedCandidates.status, "dismissed"))
      .orderBy(desc(feedCandidates.createdAt))
      .limit(50),
    db.select({ url: recipes.sourceUrl }).from(recipes),
    db.select({ n: sql<number>`count(*)::int` }).from(feedSources),
  ]);

  const timesCooked = new Map(cooked.map((r) => [r.recipe_id, Number(r.n)]));
  const byRecipe = new Map<string, { title: string; items: string[]; timesCooked: number }>();
  for (const row of library) {
    const r = byRecipe.get(row.id) ?? { title: row.title, items: [], timesCooked: timesCooked.get(row.id) ?? 0 };
    r.items.push(row.item);
    byRecipe.set(row.id, r);
  }
  const alreadySaved = new Set(saved.map((s) => s.url && normUrl(s.url)).filter(Boolean));
  const fresh = candidates.filter((c) => !alreadySaved.has(normUrl(c.url)));

  const ranked = scoreCandidates(fresh, {
    library: [...byRecipe.values()],
    shopping: list.items.map((i) => i.item),
    staples: new Set(staples),
    dismissed: dismissedRows.map((d) => keysFromLines(d.ingredients)),
  });
  const byId = new Map(fresh.map((c) => [c.id, c]));
  const suggestions = ranked.slice(0, limit).map((s) => {
    const c = byId.get(s.id)!;
    return {
      id: c.id,
      title: c.title,
      url: c.url,
      imageUrl: c.imageUrl,
      totalMinutes: c.totalMinutes,
      sourceName: c.sourceName,
      reason: s.reason,
    };
  });
  return { suggestions, sources: sourceCount[0]?.n ?? 0, waiting: fresh.length };
}

export async function getCandidate(id: string) {
  const [row] = await db.select().from(feedCandidates).where(eq(feedCandidates.id, id));
  return row ?? null;
}

export async function setCandidateStatus(id: string, status: "saved" | "dismissed") {
  await db.update(feedCandidates).set({ status }).where(eq(feedCandidates.id, id));
}

// ─── Websites (Settings) ────────────────────────────────────────────────────

export async function listSources() {
  return db
    .select({
      id: feedSources.id,
      name: feedSources.name,
      siteUrl: feedSources.siteUrl,
      lastCheckedAt: feedSources.lastCheckedAt,
      lastError: feedSources.lastError,
      waiting: sql<number>`(select count(*)::int from ${feedCandidates}
        where ${feedCandidates.sourceId} = "feed_sources"."id" and ${feedCandidates.status} = 'new')`,
    })
    .from(feedSources)
    .orderBy(feedSources.name);
}

/** Adds a recipe website and checks it straight away so the feed isn't empty. */
export async function addSource(input: string): Promise<{ error: string } | { name: string; added: number; problem: string | null }> {
  let site: URL;
  try {
    site = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return { error: "That doesn't look like a website address." };
  }
  const siteUrl = `${site.protocol}//${site.host}`;
  const existing = await db.select().from(feedSources).where(eq(feedSources.siteUrl, siteUrl));
  if (existing.length) return { error: `${existing[0].name} is already on the list.` };
  const [source] = await db
    .insert(feedSources)
    .values({ name: await siteName(siteUrl), siteUrl })
    .returning();
  const res = await refreshSource(source, 25);
  return { name: source.name, added: res.added, problem: res.error };
}

export async function removeSource(id: string) {
  await db.delete(feedSources).where(eq(feedSources.id, id));
}

export async function checkSource(id: string) {
  const [source] = await db.select().from(feedSources).where(eq(feedSources.id, id));
  if (!source) return null;
  return refreshSource(source, 25);
}
