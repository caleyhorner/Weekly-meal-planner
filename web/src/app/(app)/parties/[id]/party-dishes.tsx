"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { RecipeThumb } from "@/components/recipe-thumb";
import type { PartyDish } from "@/lib/parties";
import { formatMinutes } from "@/lib/format";
import { MULTIPLIERS, autoMultiplier, multiplierLabel, servesLabel } from "@/lib/scaling";
import { removeDishAction, setDishMultiplierAction } from "../actions";

type Change = { type: "remove"; id: string } | { type: "size"; id: string; multiplier: number | null };

/** The party's dishes, each sized to feed everyone unless changed by hand. */
export function PartyDishes({ partyId, guests, dishes }: { partyId: string; guests: number; dishes: PartyDish[] }) {
  const [, startTransition] = useTransition();
  const [shown, apply] = useOptimistic(dishes, (state: PartyDish[], c: Change) =>
    c.type === "remove"
      ? state.filter((d) => d.id !== c.id)
      : state.map((d) =>
          d.id === c.id
            ? { ...d, chosenMultiplier: c.multiplier, multiplier: c.multiplier ?? autoMultiplier(d.recipe.servings, guests) }
            : d,
        ),
  );
  const run = (c: Change, fn: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(c);
      await fn();
    });

  if (shown.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-xl font-bold">No dishes yet.</p>
        <p className="mt-2 text-muted">Add everything you&apos;re making: starters, mains, sides and dessert.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {shown.map((d) => {
        const r = d.recipe;
        const auto = autoMultiplier(r.servings, guests);
        // ½, 1, 2 and 3 times, plus a bigger size when that's what it takes to feed everyone.
        const options = [...new Set([...MULTIPLIERS, auto])].sort((a, b) => a - b);
        const makes = r.servings * d.multiplier;
        return (
          <li key={d.id} className="card p-4">
            <div className="flex items-start gap-3">
              <RecipeThumb imageKey={r.thumb} title={r.title} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/recipes/${r.id}?serves=${makes}`}
                  className="block text-[21px] leading-snug font-bold hover:underline"
                >
                  {r.title}
                </Link>
                <p className="mt-1 text-[15px] text-muted">
                  Makes {servesLabel(makes)}
                  {d.multiplier !== 1 ? ` (recipe ${multiplierLabel(d.multiplier)})` : ""}
                  {r.minutes ? `, ${formatMinutes(r.minutes)}` : ""}
                </p>
                {makes < guests && (
                  <p className="mt-1 text-[15px] font-bold text-danger">Not enough for all {guests}.</p>
                )}
              </div>
            </div>

            <p id={`size-${d.id}`} className="mt-3 mb-2 text-[15px] font-bold">
              How much to make?
            </p>
            <div
              role="group"
              aria-labelledby={`size-${d.id}`}
              className={`grid gap-1.5 ${options.length > 4 ? "grid-cols-5" : "grid-cols-4"}`}
            >
              {options.map((m) => {
                const active = d.multiplier === m;
                const isAuto = m === auto;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      run({ type: "size", id: d.id, multiplier: isAuto ? null : m }, () =>
                        setDishMultiplierAction(partyId, d.id, isAuto ? null : m),
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

            <button
              type="button"
              className="btn-ghost mt-3 bg-bg"
              onClick={() => run({ type: "remove", id: d.id }, () => removeDishAction(partyId, d.id))}
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
}
