import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeThumb } from "@/components/recipe-thumb";
import { getParty } from "@/lib/parties";
import { listRecipes } from "@/lib/recipes";
import { formatMinutes } from "@/lib/format";
import { addDishAction } from "../../actions";
import { PickButton } from "../../../week/[date]/pick/pick-button";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PickPartyDishPage({ params, searchParams }: PageProps<"/parties/[id]/pick">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [party, recipes] = await Promise.all([getParty(id), listRecipes({ q, sort: "az" })]);
  if (!party) notFound();
  const onMenu = new Set(party.dishes.map((d) => d.recipe.id));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/parties/${id}`} className="inline-flex min-h-11 items-center gap-1.5 font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to {party.name}
      </Link>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold">Add dishes</h1>
      <p className="text-[17px] text-muted">
        Tap as many as you like. Each one is made to feed all {party.guests}.
      </p>

      <form role="search" className="mt-4">
        <label htmlFor="q" className="sr-only">
          Search recipes or ingredients
        </label>
        <input id="q" type="search" name="q" defaultValue={q} placeholder="Recipe or ingredient" className="input h-14" />
      </form>

      {recipes.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-xl font-bold">{q ? "No recipes match that." : "No recipes saved yet."}</p>
          <Link href="/recipes/new" className="btn-primary mt-4">
            Add a recipe
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {recipes.map((r) => {
            const time = formatMinutes((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0));
            const added = onMenu.has(r.id);
            return (
              <li key={r.id}>
                <form action={addDishAction.bind(null, id, r.id)}>
                  <PickButton highlighted={added}>
                    <RecipeThumb imageKey={r.thumb} title={r.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg leading-snug font-bold">{r.title}</span>
                      <span className="mt-0.5 block text-[15px] text-muted">
                        {added ? "✓ On the menu" : `Serves ${r.servings}`}
                      </span>
                    </span>
                    {time && <span className="shrink-0 rounded-xl bg-bg px-2.5 py-1.5 text-[15px] font-bold">{time}</span>}
                  </PickButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-[84px] z-10 mt-6 sm:bottom-4">
        <Link href={`/parties/${id}`} className="btn w-full bg-ink text-bg">
          Done: {party.dishes.length} {party.dishes.length === 1 ? "dish" : "dishes"} on the menu
        </Link>
      </div>
    </div>
  );
}
