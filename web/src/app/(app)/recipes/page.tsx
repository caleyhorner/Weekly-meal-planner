import Link from "next/link";
import { listRecipes, listTags } from "@/lib/recipes";
import { formatMinutes, relativeDays } from "@/lib/format";
import { RecipeCover } from "@/components/recipe-cover";

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const [recipes, tags] = await Promise.all([listRecipes({ q, tag }), listTags()]);

  const tagHref = (t: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t && t !== tag) params.set("tag", t);
    const s = params.toString();
    return s ? `/recipes?${s}` : "/recipes";
  };

  return (
    <div>
      <form action="/recipes" className="flex gap-2">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search recipes or ingredients"
          className="input"
          aria-label="Search recipes or ingredients"
        />
        <button className="btn-ghost shrink-0">Search</button>
      </form>

      {tags.length > 0 && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {tags.map((t) => (
            <Link key={t} href={tagHref(t)} className={t === tag ? "chip-active" : "chip"}>
              #{t}
            </Link>
          ))}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-serif text-2xl">
            {q || tag ? "Nothing matches that." : "No recipes yet."}
          </p>
          <p className="mt-2 text-muted">
            {q || tag
              ? "Try a different word or clear the filter."
              : "Snap a cookbook page, paste a link or drop in a screenshot."}
          </p>
          {!(q || tag) && (
            <Link href="/recipes/new" className="btn-primary mt-6">
              Add the first recipe
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r) => {
            const time = formatMinutes((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0));
            const cooked = relativeDays(r.lastCooked);
            return (
              <li key={r.id}>
                <Link
                  href={`/recipes/${r.id}`}
                  className="group block overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <RecipeCover title={r.title} imageKey={r.heroImageUrl} />
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-2 font-serif text-lg leading-snug font-semibold">
                      {r.title}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {[time, cooked ? `cooked ${cooked}` : "not cooked yet"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
