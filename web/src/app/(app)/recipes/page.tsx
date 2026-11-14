import Link from "next/link";
import { countToCheck, listRecipes, listTags, type RecipeSort } from "@/lib/recipes";
import type { RecipeKind } from "@/lib/recipe-model";
import { formatMinutes, relativeDays } from "@/lib/format";

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const sort: RecipeSort = sp.sort === "az" ? "az" : "lately";
  const kind: RecipeKind | undefined = sp.kind === "dinner" || sp.kind === "snack" ? sp.kind : undefined;
  const toCheck = sp.check === "1";
  const [recipes, tags, checkCount] = await Promise.all([
    listRecipes({ q, tag, sort, kind, toCheck }),
    listTags(),
    countToCheck(),
  ]);

  const href = (changes: { tag?: string; sort?: RecipeSort; kind?: RecipeKind | "" }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const k = changes.kind ?? kind;
    if (k) params.set("kind", k);
    if (toCheck) params.set("check", "1");
    const t = changes.tag ?? tag;
    if (t) params.set("tag", t);
    const s = changes.sort ?? sort;
    if (s !== "lately") params.set("sort", s);
    const str = params.toString();
    return str ? `/recipes?${str}` : "/recipes";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="pt-2 text-3xl leading-tight font-extrabold">
        {toCheck ? "Recipes to check" : "What's for dinner?"}
      </h1>
      {toCheck ? (
        <p className="mt-1 text-[17px] text-muted">
          These were added by bulk import. Open each one, fix anything the AI misread, then tap{" "}
          <strong>Looks good</strong>.{" "}
          <Link href="/recipes" className="font-bold text-ink underline">
            Show all recipes
          </Link>
        </p>
      ) : (
        checkCount > 0 && (
          <Link href="/recipes?check=1" className="mt-3 flex min-h-12 items-center justify-between rounded-2xl bg-lemon px-4 font-bold text-lemon-ink">
            <span>
              {checkCount} {checkCount === 1 ? "recipe" : "recipes"} to check
            </span>
            <span aria-hidden>›</span>
          </Link>
        )
      )}

      <form action="/recipes" role="search" className="mt-4">
        {tag && <input type="hidden" name="tag" value={tag} />}
        {sort !== "lately" && <input type="hidden" name="sort" value={sort} />}
        {kind && <input type="hidden" name="kind" value={kind} />}
        {toCheck && <input type="hidden" name="check" value="1" />}
        <label htmlFor="q" className="sr-only">
          Search recipes or ingredients
        </label>
        <div className="flex h-14 items-center gap-3 rounded-2xl bg-surface px-4 focus-within:ring-2 focus-within:ring-accent">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            id="q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Recipe or ingredient"
            className="min-w-0 flex-1 bg-transparent text-lg focus:outline-none"
          />
        </div>
      </form>

      <nav aria-label="Dinners or snacks" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
        {(
          [
            ["", "All"],
            ["dinner", "Dinners"],
            ["snack", "Snacks"],
          ] as const
        ).map(([value, label]) => {
          const active = (kind ?? "") === value;
          return (
            <Link
              key={label}
              href={href({ kind: value })}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center justify-center rounded-xl text-base ${
                active ? "bg-surface font-bold shadow-sm" : "font-medium"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div role="group" aria-label="Sort recipes" className="mt-3 grid grid-cols-2 rounded-2xl bg-surface-2 p-1">
        {(
          [
            ["lately", "Not had lately"],
            ["az", "A to Z"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={href({ sort: value })}
            aria-current={sort === value ? "true" : undefined}
            className={`flex h-11 items-center justify-center rounded-xl text-base ${
              sort === value ? "bg-surface font-bold" : "font-medium"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tags.length > 0 && (
        <nav aria-label="Filter by tag" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {tag && (
            <Link href={href({ tag: "" })} className="chip shrink-0">
              All
            </Link>
          )}
          {tags.map((t) => (
            <Link
              key={t}
              href={href({ tag: t === tag ? "" : t })}
              aria-current={t === tag ? "true" : undefined}
              className={`shrink-0 ${t === tag ? "chip-active" : "chip"}`}
            >
              {t}
            </Link>
          ))}
        </nav>
      )}

      {recipes.length === 0 ? (
        <div className="card mt-6 p-6 text-center">
          <p className="text-xl font-bold">{q || tag ? "Nothing matches that." : "No recipes yet."}</p>
          <p className="mt-2 text-muted">
            {q || tag
              ? "Try another word, or clear the tag."
              : "Snap a cookbook page, paste a link or add a screenshot to get started."}
          </p>
          {!(q || tag) && (
            <Link href="/recipes/new" className="btn-primary mt-5">
              Add a recipe
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {recipes.map((r) => {
            const time = formatMinutes((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0));
            const cooked = relativeDays(r.lastCooked);
            return (
              <li key={r.id}>
                <Link
                  href={`/recipes/${r.id}`}
                  className="card flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg leading-snug font-bold">{r.title}</span>
                    <span className="mt-0.5 block text-[15px] text-muted">
                      {r.needsReview ? "To check. " : ""}
                      {r.kind === "snack" ? "Snack. " : ""}
                      {cooked ? `Last had ${cooked}` : "Not tried yet"}
                    </span>
                  </span>
                  {time && (
                    <span className="shrink-0 rounded-xl bg-bg px-2.5 py-1.5 text-[15px] font-bold">
                      {time}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
