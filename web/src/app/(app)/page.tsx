import Link from "next/link";
import { getWeek, householdToday } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import { addDays, isIsoDate, weekRangeLabel, weekStartFor } from "@/lib/week";
import { relativeDays } from "@/lib/format";
import { WeekBoard } from "./week/week-board";

export default async function WeekPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const today = await householdToday();
  const thisWeek = weekStartFor(today);
  const start = isIsoDate(sp.week) ? weekStartFor(sp.week) : thisWeek;
  const [{ days, household }, recipes] = await Promise.all([
    getWeek(start),
    listRecipes({ sort: "lately" }),
  ]);

  const planned = days.filter((d) => d.status === "recipe").length;
  const skipped = days.filter((d) => d.status === "skip").length;
  const open = 7 - planned - skipped;
  const heading =
    start === thisWeek ? "This week" : start === addDays(thisWeek, 7) ? "Next week" : start === addDays(thisWeek, -7) ? "Last week" : "Week of";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl leading-tight font-extrabold">{heading}</h1>
          <p className="text-[17px] text-muted">{weekRangeLabel(start)}</p>
        </div>
        <nav aria-label="Change week" className="flex gap-2">
          <Link href={`/?week=${addDays(start, -7)}`} className="btn-ghost w-12 px-0" aria-label="Previous week">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          {start !== thisWeek && (
            <Link href="/" className="btn-ghost">
              Today
            </Link>
          )}
          <Link href={`/?week=${addDays(start, 7)}`} className="btn-ghost w-12 px-0" aria-label="Next week">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
        </nav>
      </div>

      <p className="mt-3 text-[17px]">
        {open === 0
          ? `All seven nights sorted${skipped ? `, ${skipped} skipped` : ""}.`
          : `${planned} planned${skipped ? `, ${skipped} skipped` : ""}, ${open} still to pick.`}{" "}
        Sized for {household}.
      </p>

      <WeekBoard
        days={days}
        today={today}
        household={household}
        recipes={recipes.map((r) => ({
          id: r.id,
          title: r.title,
          cooked: relativeDays(r.lastCooked),
        }))}
      />
    </div>
  );
}
