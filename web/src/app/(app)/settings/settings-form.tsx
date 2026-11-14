"use client";

import { useState, useTransition } from "react";
import { capitalise } from "@/lib/shopping";
import {
  addStapleAction,
  removeAliasAction,
  removeStapleAction,
  setHouseholdSizeAction,
} from "../list/actions";

export function SettingsForm({
  size,
  staples,
  aliases,
}: {
  size: number;
  staples: string[];
  aliases: { alias: string; item: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [newStaple, setNewStaple] = useState("");
  const run = (fn: () => Promise<unknown>) => startTransition(async () => void (await fn()));

  return (
    <div className="mt-4 flex flex-col gap-4" aria-busy={pending}>
      <section aria-labelledby="household" className="card p-4">
        <h2 id="household" className="text-[22px] font-extrabold">
          How many we cook for
        </h2>
        <p className="mt-1 text-muted">
          Recipes are halved, kept, doubled or tripled so there&apos;s enough for this many.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost w-12 bg-bg px-0 text-2xl"
            aria-label="Fewer people"
            disabled={size <= 1 || pending}
            onClick={() => run(() => setHouseholdSizeAction(size - 1))}
          >
            −
          </button>
          <span className="min-w-24 text-center text-2xl font-extrabold">{size} people</span>
          <button
            type="button"
            className="btn-ghost w-12 bg-bg px-0 text-2xl"
            aria-label="More people"
            disabled={size >= 20 || pending}
            onClick={() => run(() => setHouseholdSizeAction(size + 1))}
          >
            +
          </button>
        </div>
      </section>

      <section aria-labelledby="staples" className="card p-4">
        <h2 id="staples" className="text-[22px] font-extrabold">
          Always in the cupboard
        </h2>
        <p className="mt-1 text-muted">These never go on the shopping list.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {staples.map((s) => (
            <li key={s} className="flex items-center gap-1 rounded-xl bg-bg py-1 pr-1 pl-3 font-bold">
              {capitalise(s)}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
                aria-label={`Remove ${s}`}
                disabled={pending}
                onClick={() => run(() => removeStapleAction(s))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newStaple.trim()) return;
            const v = newStaple;
            setNewStaple("");
            run(() => addStapleAction(v));
          }}
        >
          <label htmlFor="new-staple" className="sr-only">
            Add a staple
          </label>
          <input
            id="new-staple"
            className="input bg-bg"
            placeholder="e.g. soy sauce"
            value={newStaple}
            onChange={(e) => setNewStaple(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={pending}>
            Add
          </button>
        </form>
      </section>

      <section aria-labelledby="aliases" className="card p-4">
        <h2 id="aliases" className="text-[22px] font-extrabold">
          Same things, different names
        </h2>
        <p className="mt-1 text-muted">
          Set these from the shopping list with “Same thing as another item?”.
        </p>
        {aliases.length === 0 ? (
          <p className="mt-3">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {aliases.map((a) => (
              <li key={a.alias} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <strong>{capitalise(a.alias)}</strong> counts as <strong>{a.item}</strong>
                </span>
                <button
                  type="button"
                  className="btn-ghost bg-bg"
                  disabled={pending}
                  onClick={() => run(() => removeAliasAction(a.alias))}
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
