import Link from "next/link";
import { RecipeThumb } from "@/components/recipe-thumb";
import { notFound } from "next/navigation";
import { getWeek } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import { formatMinutes, relativeDays } from "@/lib/format";
import { dayName, isIsoDate, shortDate, weekStartFor } from "@/lib/week";
import { pickRecipeAction } from "../../actions";
import { PickButton } from "./pick-button";

export default async function PickDinnerPage({ params, searchParams }: PageProps<"/week/[date]/pick">) {
  const { date } = await params;
  if (!isIsoDate(date)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const start = weekStartFor(date);
  const [recipes, { days }] = await Promise.all([listRecipes({ q, sort: "lately", kind: "dinner" }), getWeek(start)]);

  const plannedOn = new Map<string, string>();
  for (const d of days) if (d.recipe) plannedOn.set(d.recipe.id, dayName(d.date));
  const current = days.find((d) => d.date === date)?.recipe?.id;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/?week=${start}`} className="inline-flex min-h-11 items-center gap-1.5 font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to the week
      </Link>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold">
        Dinner for {dayName(date)}
      </h1>
      <p className="text-[17px] text-muted">{shortDate(date)}. Ones you haven&apos;t had for a while are at the top.</p>

      <form role="search" className="mt-4">
        <label htmlFor="q" className="sr-only">
          Search recipes or ingredients
        </label>
        <input id="q" type="search" name="q" defaultValue={q} placeholder="Recipe or ingredient" className="input h-14" />
      </form>

      {recipes.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-xl font-bold">{q ? "Nothing matches that." : "No recipes yet."}</p>
          <Link href="/recipes/new" className="btn-primary mt-4">
            Add a recipe
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {recipes.map((r) => {
            const time = formatMinutes((r.prepMinutes ?? 0) + (r.cookMinutes ?? 0));
            const cooked = relativeDays(r.lastCooked);
            const elsewhere = plannedOn.get(r.id);
            const isCurrent = r.id === current;
            return (
              <li key={r.id}>
                <form action={pickRecipeAction.bind(null, date, r.id)}>
                  <PickButton highlighted={isCurrent}>
                    <RecipeThumb imageKey={r.thumb} title={r.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg leading-snug font-bold">{r.title}</span>
                      <span className="mt-0.5 block text-[15px] text-muted">
                        {isCurrent
                          ? "Planned for this night"
                          : elsewhere
                            ? `Already on ${elsewhere} this week`
                            : cooked
                              ? `Last had ${cooked}`
                              : "Not tried yet"}
                      </span>
                    </span>
                    {time && (
                      <span className="shrink-0 rounded-xl bg-bg px-2.5 py-1.5 text-[15px] font-bold">{time}</span>
                    )}
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
