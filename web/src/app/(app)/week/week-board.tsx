"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { PlannedDay } from "@/lib/plan";
import { formatMinutes } from "@/lib/format";
import { MULTIPLIERS, autoMultiplier, multiplierLabel, servesLabel } from "@/lib/scaling";
import { dayName, shortDate } from "@/lib/week";
import {
  clearDayAction,
  moveDayAction,
  planRecipeAction,
  setMultiplierAction,
  skipDayAction,
} from "./actions";

type SidebarRecipe = {
  id: string;
  title: string;
  cooked: string | null;
  servings: number;
  minutes: number | null;
};

/** A change shown on screen straight away, before the server confirms it. */
type Change =
  | { type: "plan"; date: string; recipe: SidebarRecipe }
  | { type: "skip"; date: string }
  | { type: "clear"; date: string }
  | { type: "size"; date: string; multiplier: number | null }
  | { type: "move"; from: string; to: string };

function applyChange(days: PlannedDay[], change: Change, household: number): PlannedDay[] {
  const set = (date: string, fn: (d: PlannedDay) => PlannedDay) =>
    days.map((d) => (d.date === date ? fn(d) : d));
  switch (change.type) {
    case "plan": {
      const r = change.recipe;
      return set(change.date, (d) => ({
        ...d,
        status: "recipe",
        recipe: { id: r.id, title: r.title, servings: r.servings, minutes: r.minutes },
        chosenMultiplier: null,
        multiplier: autoMultiplier(r.servings, household),
      }));
    }
    case "skip":
      return set(change.date, (d) => ({ ...d, status: "skip", recipe: null, chosenMultiplier: null, multiplier: 1 }));
    case "clear":
      return set(change.date, (d) => ({ ...d, status: "empty", recipe: null, chosenMultiplier: null, multiplier: 1 }));
    case "size":
      return set(change.date, (d) =>
        d.recipe
          ? {
              ...d,
              chosenMultiplier: change.multiplier,
              multiplier: change.multiplier ?? autoMultiplier(d.recipe.servings, household),
            }
          : d,
      );
    case "move": {
      const a = days.find((d) => d.date === change.from);
      const b = days.find((d) => d.date === change.to);
      if (!a || !b) return days;
      return days.map((d) =>
        d.date === change.to ? { ...a, date: change.to } : d.date === change.from ? { ...b, date: change.from } : d,
      );
    }
  }
}

const DRAG_RECIPE = "application/x-dinners-recipe";
const DRAG_DAY = "application/x-dinners-day";

function DayCard({
  day,
  today,
  household,
  run,
  onDropRecipe,
  onDropDay,
}: {
  day: PlannedDay;
  today: string;
  household: number;
  run: (change: Change, fn: () => Promise<unknown>) => void;
  onDropRecipe: (recipeId: string) => void;
  onDropDay: (from: string) => void;
}) {
  const [sizing, setSizing] = useState(false);
  const [over, setOver] = useState(false);
  const isToday = day.date === today;
  const past = day.date < today;
  const r = day.recipe;

  return (
    <li
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types);
        if (types.includes(DRAG_RECIPE) || types.includes(DRAG_DAY)) {
          e.preventDefault();
          // Must match the source's effectAllowed or the browser refuses the drop.
          e.dataTransfer.dropEffect = types.includes(DRAG_DAY) ? "move" : "copy";
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const recipeId = e.dataTransfer.getData(DRAG_RECIPE);
        const from = e.dataTransfer.getData(DRAG_DAY);
        if (recipeId) onDropRecipe(recipeId);
        else if (from) onDropDay(from);
      }}
      className={`card p-4 transition-shadow ${over ? "ring-4 ring-accent" : ""} ${
        isToday ? "ring-2 ring-ink" : ""
      } ${past && !isToday ? "opacity-75" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">
          {dayName(day.date)} <span className="font-medium text-muted">{shortDate(day.date)}</span>
        </h2>
        {isToday && (
          <span className="rounded-lg bg-lemon px-2 py-0.5 text-sm font-bold text-lemon-ink">Tonight</span>
        )}
      </div>

      {day.status === "recipe" && r ? (
        <div className="mt-2">
          {/* Desktop: drag this block onto another day to move (or swap) the dinner. */}
          <div
            draggable
            data-drag-day={day.date}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_DAY, day.date);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="flex items-start gap-2 lg:cursor-grab"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="mt-1.5 hidden shrink-0 text-muted lg:block">
              <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
              <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
              <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
            </svg>
            <div className="min-w-0">
              <Link
                href={`/recipes/${r.id}?serves=${r.servings * day.multiplier}`}
                draggable={false}
                className="block text-[21px] leading-snug font-bold hover:underline"
              >
                {r.title}
              </Link>
              <p className="mt-1 text-[15px] text-muted">
                Makes {servesLabel(r.servings * day.multiplier)}
                {day.multiplier !== 1 ? ` (recipe ${multiplierLabel(day.multiplier)})` : ""}
                {r.minutes ? `, ${formatMinutes(r.minutes)}` : ""}
              </p>
            </div>
          </div>

          {sizing && (
            <div className="mt-3">
              <p id={`size-${day.date}`} className="mb-2 text-[15px] font-bold">
                How much to make?
              </p>
              <div role="group" aria-labelledby={`size-${day.date}`} className="grid grid-cols-4 gap-1.5">
                {MULTIPLIERS.map((m) => {
                  const active = day.multiplier === m;
                  const auto = autoMultiplier(r.servings, household) === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        run({ type: "size", date: day.date, multiplier: auto ? null : m }, () =>
                          setMultiplierAction(day.date, auto ? null : m),
                        )
                      }
                      className={`flex min-h-14 flex-col items-center justify-center rounded-[14px] border-2 px-1 leading-tight ${
                        active ? "border-ink bg-ink text-bg" : "border-surface-2 bg-surface hover:border-muted"
                      }`}
                    >
                      <span className="text-lg font-bold">{servesLabel(r.servings * m)}</span>
                      <span className="text-xs">{multiplierLabel(m)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/week/${day.date}/pick`} className="btn-ghost bg-bg">
              Change
            </Link>
            <button type="button" className="btn-ghost bg-bg" onClick={() => setSizing((s) => !s)}>
              {sizing ? "Done" : "Make more or less"}
            </button>
            <button
              type="button"
              className="btn-ghost bg-bg"
              onClick={() => run({ type: "skip", date: day.date }, () => skipDayAction(day.date))}
            >
              Skip
            </button>
          </div>
        </div>
      ) : day.status === "skip" ? (
        <div className="mt-2">
          <p className="text-lg text-muted">Skipped. No dinner to shop for.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/week/${day.date}/pick`} className="btn-ghost bg-bg">
              Pick a dinner
            </Link>
            <button
              type="button"
              className="btn-ghost bg-bg"
              onClick={() => run({ type: "clear", date: day.date }, () => clearDayAction(day.date))}
            >
              Undo skip
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-lg text-muted">Nothing planned yet.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/week/${day.date}/pick`} className="btn-primary">
              Pick a dinner
            </Link>
            <button
              type="button"
              className="btn-ghost bg-bg"
              onClick={() => run({ type: "skip", date: day.date }, () => skipDayAction(day.date))}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function WeekBoard({
  days,
  today,
  household,
  recipes,
}: {
  days: PlannedDay[];
  today: string;
  household: number;
  recipes: SidebarRecipe[];
}) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [shownDays, applyOptimistic] = useOptimistic(days, (state: PlannedDay[], change: Change) =>
    applyChange(state, change, household),
  );
  // Update the screen immediately, then save. If saving fails the screen falls back to the server's view.
  const run = (change: Change, fn: () => Promise<unknown>) =>
    startTransition(async () => {
      applyOptimistic(change);
      await fn();
    });

  const plannedIds = useMemo(
    () => new Set(shownDays.map((d) => d.recipe?.id).filter(Boolean)),
    [shownDays],
  );
  const shown = recipes.filter((r) => r.title.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
      <ol className="flex flex-col gap-3" aria-busy={pending}>
        {shownDays.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            today={today}
            household={household}
            run={run}
            onDropRecipe={(id) => {
              const recipe = recipes.find((r) => r.id === id);
              if (recipe) run({ type: "plan", date: day.date, recipe }, () => planRecipeAction(day.date, id));
            }}
            onDropDay={(from) => run({ type: "move", from, to: day.date }, () => moveDayAction(from, day.date))}
          />
        ))}
      </ol>

      {/* Desktop: drag recipes onto days. Phones use "Pick a dinner". */}
      <aside className="card sticky top-20 hidden max-h-[calc(100dvh-7rem)] flex-col p-4 lg:flex">
        <h2 className="text-lg font-extrabold">Recipes</h2>
        <p className="text-[15px] text-muted">Drag one onto a day. Drag a planned dinner to move it.</p>
        <label htmlFor="sidebar-filter" className="sr-only">
          Filter recipes
        </label>
        <input
          id="sidebar-filter"
          type="search"
          className="input mt-3 bg-bg"
          placeholder="Filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <ul className="mt-3 flex flex-col gap-1.5 overflow-y-auto">
          {shown.map((r) => (
            <li
              key={r.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_RECIPE, r.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="cursor-grab rounded-xl bg-bg px-3 py-2 active:cursor-grabbing"
            >
              <span className="block font-bold">{r.title}</span>
              <span className="block text-sm text-muted">
                {plannedIds.has(r.id) ? "Planned this week" : r.cooked ? `Last had ${r.cooked}` : "Not tried yet"}
              </span>
            </li>
          ))}
          {shown.length === 0 && <li className="text-muted">No recipes match.</li>}
        </ul>
      </aside>
    </div>
  );
}
