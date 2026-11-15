import Link from "next/link";
import { RecipeThumb } from "@/components/recipe-thumb";
import { getWeekSnacks, householdToday } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import { formatMinutes, relativeDays } from "@/lib/format";
import { isIsoDate, weekRangeLabel, weekStartFor } from "@/lib/week";
import { addSnackAction } from "../../actions";
import { PickButton } from "../../[date]/pick/pick-button";

export default async function PickSnackPage({ searchParams }: PageProps<"/week/snacks/pick">) {
  const sp = await searchParams;
  const start = isIsoDate(sp.week) ? weekStartFor(sp.week) : weekStartFor(await householdToday());
  const q = typeof sp.q === "string" ? sp.q : "";
  const [snacks, planned] = await Promise.all([listRecipes({ q, sort: "lately", kind: "snack" }), getWeekSnacks(start)]);
  const already = new Set(planned.map((s) => s.recipe.id));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/?week=${start}#snacks`} className="inline-flex min-h-11 items-center gap-1.5 font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to the week
      </Link>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold">Add a snack</h1>
      <p className="text-[17px] text-muted">For the week of {weekRangeLabel(start)}.</p>

      <form role="search" className="mt-4">
        <input type="hidden" name="week" value={start} />
        <label htmlFor="q" className="sr-only">
          Search snacks
        </label>
        <input id="q" type="search" name="q" defaultValue={q} placeholder="Search snacks" className="input h-14" />
      </form>

      {snacks.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-xl font-bold">{q ? "No snacks match that." : "No snacks saved yet."}</p>
          <p className="mt-2 text-muted">
            Add a recipe and choose <strong>Snack</strong>, or change an existing recipe to a snack on its edit
            screen.
          </p>
          <Link href="/recipes/new" className="btn-primary mt-4">
            Add a recipe
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {snacks.map((r) => {
            const time = formatMinutes((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0));
            const made = relativeDays(r.lastCooked);
            return (
              <li key={r.id}>
                <form action={addSnackAction.bind(null, start, r.id)}>
                  <PickButton highlighted={false}>
                    <RecipeThumb imageKey={r.thumb} title={r.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg leading-snug font-bold">{r.title}</span>
                      <span className="mt-0.5 block text-[15px] text-muted">
                        {already.has(r.id) ? "Already on this week's list" : made ? `Last made ${made}` : "Not tried yet"}
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
    </div>
  );
}
