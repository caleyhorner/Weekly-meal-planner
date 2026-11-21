"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import type { WeekSnack } from "@/lib/plan";
import { formatMinutes } from "@/lib/format";
import { MULTIPLIERS, servesLabel } from "@/lib/scaling";
import { removeSnackAction, setSnackMultiplierAction } from "./actions";

const BATCH_LABEL: Record<number, string> = { 0.5: "Half", 1: "1 batch", 2: "2 batches", 3: "3 batches" };

type Change = { type: "remove"; id: string } | { type: "size"; id: string; multiplier: number };

/** "Snacks to make" for the week: any number, made by the batch (not sized for the household). */
export function SnackList({ weekStart, snacks }: { weekStart: string; snacks: WeekSnack[] }) {
  const [, startTransition] = useTransition();
  const [shown, apply] = useOptimistic(snacks, (state: WeekSnack[], c: Change) =>
    c.type === "remove"
      ? state.filter((s) => s.id !== c.id)
      : state.map((s) => (s.id === c.id ? { ...s, multiplier: c.multiplier } : s)),
  );
  const run = (c: Change, fn: () => Promise<unknown>) =>
    startTransition(async () => {
      apply(c);
      await fn();
    });

  return (
    <section id="snacks" aria-labelledby="snacks-heading" className="mt-8 scroll-mt-20 lg:mr-[324px]">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="snacks-heading" className="text-2xl font-extrabold">
          Snacks to make
        </h2>
        <p className="text-[15px] text-muted">
          {shown.length === 0 ? "None yet" : `${shown.length} this week`}
        </p>
      </div>

      {shown.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {shown.map((s) => (
            <li key={s.id} className="card p-4">
              <Link
                href={`/recipes/${s.recipe.id}?serves=${s.recipe.servings * s.multiplier}`}
                className="block text-[21px] leading-snug font-bold hover:underline"
              >
                {s.recipe.title}
              </Link>
              <p className="mt-1 text-[15px] text-muted">
                Makes {servesLabel(s.recipe.servings * s.multiplier)}
                {s.recipe.minutes ? `, ${formatMinutes(s.recipe.minutes)}` : ""}
              </p>
              <div role="group" aria-label={`How much ${s.recipe.title} to make`} className="mt-3 grid grid-cols-4 gap-1.5">
                {MULTIPLIERS.map((m) => {
                  const active = s.multiplier === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        run({ type: "size", id: s.id, multiplier: m }, () => setSnackMultiplierAction(s.id, m))
                      }
                      className={`min-h-12 rounded-[14px] border-2 px-1 text-[15px] font-bold leading-tight ${
                        active ? "border-ink bg-ink text-bg" : "border-surface-2 bg-surface hover:border-muted"
                      }`}
                    >
                      {BATCH_LABEL[m]}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn-ghost mt-3 bg-bg"
                onClick={() => run({ type: "remove", id: s.id }, () => removeSnackAction(s.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link href={`/week/snacks/pick?week=${weekStart}`} className="btn-primary mt-3 w-full">
        Add a snack
      </Link>
    </section>
  );
}
