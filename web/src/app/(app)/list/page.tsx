import Link from "next/link";
import { householdToday } from "@/lib/plan";
import { getShoppingList } from "@/lib/shopping-data";
import { addDays, isIsoDate, weekRangeLabel, weekStartFor } from "@/lib/week";
import { ShoppingList } from "./shopping-list";

export default async function ListPage({ searchParams }: PageProps<"/list">) {
  const sp = await searchParams;
  const thisWeek = weekStartFor(await householdToday());
  const start = isIsoDate(sp.week) ? weekStartFor(sp.week) : thisWeek;
  const { items, dinners } = await getShoppingList(start);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl leading-tight font-extrabold">Shopping list</h1>
          <p className="text-[17px] text-muted">
            {start === thisWeek ? "This week" : start === addDays(thisWeek, 7) ? "Next week" : "Week of"}{" "}
            {weekRangeLabel(start)}
          </p>
        </div>
        <nav aria-label="Change week" className="flex gap-2">
          <Link href={`/list?week=${addDays(start, -7)}`} className="btn-ghost w-12 px-0" aria-label="Previous week">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <Link href={`/list?week=${addDays(start, 7)}`} className="btn-ghost w-12 px-0" aria-label="Next week">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </nav>
      </div>

      {dinners === 0 ? (
        <div className="card mt-5 p-6 text-center">
          <p className="text-xl font-bold">No dinners planned for this week yet.</p>
          <p className="mt-2 text-muted">The list fills itself in from the dinners you pick.</p>
          <Link href={`/?week=${start}`} className="btn-primary mt-5">
            Plan the week
          </Link>
        </div>
      ) : (
        <ShoppingList weekStart={start} dinners={dinners} items={items} />
      )}

      <p className="mt-8 text-center">
        <Link href="/settings" className="inline-flex min-h-11 items-center font-bold underline">
          Edit staples and household size
        </Link>
      </p>
    </div>
  );
}
