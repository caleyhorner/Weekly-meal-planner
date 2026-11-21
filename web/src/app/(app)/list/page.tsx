import Link from "next/link";
import { householdToday } from "@/lib/plan";
import { getShoppingList } from "@/lib/shopping-data";
import { openClawConfigured } from "@/lib/openclaw";
import { isIsoDate, weekStartFor } from "@/lib/week";
import { WeekSwitcher } from "@/components/week-switcher";
import { ShoppingList } from "@/components/shopping-list";
import { sendToOpenClawAction, setHaveItAction } from "./actions";

export default async function ListPage({ searchParams }: PageProps<"/list">) {
  const sp = await searchParams;
  const thisWeek = weekStartFor(await householdToday());
  const start = isIsoDate(sp.week) ? weekStartFor(sp.week) : thisWeek;
  const { items, dinners, snacks } = await getShoppingList(start);

  return (
    <div className="mx-auto max-w-3xl">
      <WeekSwitcher basePath="/list" title="Shopping list" start={start} thisWeek={thisWeek} />

      {dinners + snacks === 0 ? (
        <div className="card mt-5 p-6 text-center">
          <p className="text-xl font-bold">Nothing planned for this week yet.</p>
          <p className="mt-2 text-muted">The list fills itself in from the dinners and snacks you pick.</p>
          <Link href={`/?week=${start}`} className="btn-primary mt-5">
            Plan this week
          </Link>
        </div>
      ) : (
        <ShoppingList
          key={start}
          summary={`From ${[
            dinners && `${dinners} ${dinners === 1 ? "dinner" : "dinners"}`,
            snacks && `${snacks} ${snacks === 1 ? "snack" : "snacks"}`,
          ]
            .filter(Boolean)
            .join(" and ")}`}
          items={items}
          setHaveIt={setHaveItAction.bind(null, start)}
          send={sendToOpenClawAction.bind(null, start)}
          canSendToOpenClaw={openClawConfigured()}
        />
      )}

      <p className="mt-8 text-center">
        <Link href="/settings" className="inline-flex min-h-11 items-center font-bold underline">
          Edit staples and household size
        </Link>
      </p>
    </div>
  );
}
