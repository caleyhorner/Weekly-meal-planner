import Link from "next/link";
import { householdToday } from "@/lib/plan";
import { getShoppingList } from "@/lib/shopping-data";
import { openClawConfigured } from "@/lib/openclaw";
import { isIsoDate, weekStartFor } from "@/lib/week";
import { WeekSwitcher } from "@/components/week-switcher";
import { ShoppingList } from "./shopping-list";

export default async function ListPage({ searchParams }: PageProps<"/list">) {
  const sp = await searchParams;
  const thisWeek = weekStartFor(await householdToday());
  const start = isIsoDate(sp.week) ? weekStartFor(sp.week) : thisWeek;
  const { items, dinners } = await getShoppingList(start);

  return (
    <div className="mx-auto max-w-3xl">
      <WeekSwitcher basePath="/list" title="Shopping list" start={start} thisWeek={thisWeek} />

      {dinners === 0 ? (
        <div className="card mt-5 p-6 text-center">
          <p className="text-xl font-bold">No dinners planned for this week yet.</p>
          <p className="mt-2 text-muted">The list fills itself in from the dinners you pick.</p>
          <Link href={`/?week=${start}`} className="btn-primary mt-5">
            Plan this week
          </Link>
        </div>
      ) : (
        <ShoppingList key={start} weekStart={start} dinners={dinners} items={items} canSendToOpenClaw={openClawConfigured()} />
      )}

      <p className="mt-8 text-center">
        <Link href="/settings" className="inline-flex min-h-11 items-center font-bold underline">
          Edit staples and household size
        </Link>
      </p>
    </div>
  );
}
