import Link from "next/link";
import { getWeek, householdToday } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import { isIsoDate, weekStartFor } from "@/lib/week";
import { WeekSwitcher } from "@/components/week-switcher";
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

  return (
    <div>
      <WeekSwitcher basePath="/" start={start} thisWeek={thisWeek} />

      <p className="mt-3 text-[17px]">
        {open === 0
          ? `All seven nights sorted${skipped ? `, ${skipped} skipped` : ""}.`
          : `${planned} planned${skipped ? `, ${skipped} skipped` : ""}, ${open} still to pick.`}{" "}
        Sized for {household}.
      </p>
      {planned > 0 && (
        <Link href={`/list?week=${start}`} className="btn-primary mt-3">
          Shopping list for these dinners
        </Link>
      )}

      <WeekBoard
        key={start}
        days={days}
        today={today}
        household={household}
        recipes={recipes.map((r) => ({
          id: r.id,
          title: r.title,
          cooked: relativeDays(r.lastCooked),
          servings: r.servings,
          minutes: (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0) || null,
        }))}
      />
    </div>
  );
}
