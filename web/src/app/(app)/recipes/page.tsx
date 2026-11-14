import Link from "next/link";
import { listRecipes, listTags, type RecipeSort } from "@/lib/recipes";
import { formatMinutes, relativeDays } from "@/lib/format";

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const sort: RecipeSort = sp.sort === "az" ? "az" : "lately";
  const [recipes, tags] = await Promise.all([listRecipes({ q, tag, sort }), listTags()]);

  const href = (changes: { tag?: string; sort?: RecipeSort }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const t = changes.tag ?? tag;
    if (t) params.set("tag", t);
    const s = changes.sort ?? sort;
    if (s !== "lately") params.set("sort", s);
    const str = params.toString();
    return str ? `/recipes?${str}` : "/recipes";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="pt-2 text-3xl leading-tight font-extrabold">What&apos;s for dinner?</h1>

      <form action="/recipes" role="search" className="mt-4">
        {tag && <input type="hidden" name="tag" value={tag} />}
        {sort !== "lately" && <input type="hidden" name="sort" value={sort} />}
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
