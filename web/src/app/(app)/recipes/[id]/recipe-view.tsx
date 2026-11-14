"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RecipeCover } from "@/components/recipe-cover";
import { formatMinutes, formatQuantity, relativeDays } from "@/lib/format";
import { splitLeadingQuantity } from "@/lib/parse-ingredient";

type ViewIngredient = {
  id: string;
  group: string | null;
  item: string;
  raw: string;
  amount: number | null;
  unit: string | null;
  prep: string | null;
};

export type ViewRecipe = {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  tags: string[];
  notes: string;
  steps: string[];
  sourceType: string;
  sourceLabel: string;
  sourceUrl: string | null;
  heroImage: string | null;
  lastCooked: string | null;
  ingredients: ViewIngredient[];
  sources: string[];
};

function groupIngredients(list: ViewIngredient[]) {
  const groups: { label: string | null; items: ViewIngredient[] }[] = [];
  for (const ing of list) {
    const last = groups.at(-1);
    if (last && last.label === ing.group) last.items.push(ing);
    else groups.push({ label: ing.group, items: [ing] });
  }
  return groups;
}

function ingredientLine(ing: ViewIngredient, factor: number) {
  if (ing.amount == null) {
    // Nothing to scale ("salt, to taste") – show what the recipe said.
    return { qty: "", text: ing.raw };
  }
  const qty = formatQuantity(ing.amount * factor, ing.unit);
  return { qty, text: describeIngredient(ing) };
}

/**
 * The author's wording minus the leading quantity ("2 brown onions, finely diced"
 * → "brown onions, finely diced"), so the page stays faithful while the amount scales.
 * Falls back to item + prep when the original line doesn't start with the amount.
 */
function describeIngredient(ing: ViewIngredient): string {
  const lead = splitLeadingQuantity(ing.raw);
  const sameAmount = lead.amount != null && Math.abs(lead.amount - (ing.amount ?? 0)) < 0.01;
  if (sameAmount && lead.unit === (ing.unit || null) && lead.rest) return lead.rest;
  return [ing.item, ing.prep].filter(Boolean).join(", ");
}

/** Keeps the screen on while cooking (where the browser supports it). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* user agent refused, e.g. low battery */
      }
      if (cancelled) lock?.release();
    };
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, [active]);
}

export function RecipeView({ recipe }: { recipe: ViewRecipe }) {
  const [servings, setServings] = useState(recipe.servings);
  const [cooking, setCooking] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showOriginal, setShowOriginal] = useState(false);
  useWakeLock(cooking);

  const factor = servings / recipe.servings;
  const groups = useMemo(() => groupIngredients(recipe.ingredients), [recipe.ingredients]);
  const toggle = (key: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const prep = formatMinutes(recipe.prepMinutes);
  const cook = formatMinutes(recipe.cookMinutes);
  const cooked = relativeDays(recipe.lastCooked);
  const hasOriginal = recipe.sources.length > 0 || recipe.sourceUrl;
  const big = cooking ? "text-lg sm:text-xl" : "text-base";

  return (
    <article className="mx-auto max-w-2xl">
      {!cooking && (
        <div className="-mx-4 aspect-[16/9] overflow-hidden sm:mx-0 sm:rounded-3xl">
          <RecipeCover title={recipe.title} imageKey={recipe.heroImage} large />
        </div>
      )}

      <header className={cooking ? "" : "mt-5"}>
        <h1 className="font-serif text-3xl leading-tight font-semibold sm:text-4xl">
          {recipe.title}
        </h1>
        {recipe.description && !cooking && <p className="mt-2 text-muted">{recipe.description}</p>}
        <p className="mt-2 text-sm text-muted">
          {[prep && `${prep} prep`, cook && `${cook} cook`].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            <button
              type="button"
              className="h-9 w-9 rounded-full text-lg font-semibold hover:bg-surface-2 disabled:opacity-40"
              onClick={() => setServings((s) => Math.max(1, s - 1))}
              disabled={servings <= 1}
              aria-label="Fewer servings"
            >
              −
            </button>
            <span className="min-w-24 text-center text-sm font-semibold">
              Serves {servings}
            </span>
            <button
              type="button"
              className="h-9 w-9 rounded-full text-lg font-semibold hover:bg-surface-2"
              onClick={() => setServings((s) => s + 1)}
              aria-label="More servings"
            >
              +
            </button>
          </div>
          {servings !== recipe.servings && (
            <button
              type="button"
              className="text-sm text-accent underline"
              onClick={() => setServings(recipe.servings)}
            >
              Reset to {recipe.servings}
            </button>
          )}
          <button
            type="button"
            className={cooking ? "btn-primary ml-auto" : "btn-ghost ml-auto"}
            onClick={() => {
              setCooking((c) => !c);
              setDone(new Set());
              window.scrollTo({ top: 0 });
            }}
          >
            {cooking ? "Done cooking" : "Start cooking"}
          </button>
        </div>

        {!cooking && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.tags.map((t) => (
              <Link key={t} href={`/recipes?tag=${encodeURIComponent(t)}`} className="chip">
                #{t}
              </Link>
            ))}
            <span className="chip border-transparent bg-transparent">
              {cooked ? `Last cooked ${cooked}` : "Not cooked yet"}
            </span>
          </div>
        )}
        {cooking && (
          <p className="mt-3 text-sm text-muted">
            Screen stays on while cooking. Tap ingredients and steps to tick them off.
          </p>
        )}
      </header>

      <section className="mt-8">
        <h2 className="label">Ingredients</h2>
        {groups.map((g, gi) => (
          <div key={gi} className="mt-3">
            {g.label && <h3 className="mb-1 font-serif text-lg font-semibold">{g.label}</h3>}
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {g.items.map((ing) => {
                const { qty, text } = ingredientLine(ing, factor);
                const key = `i:${ing.id}`;
                const ticked = done.has(key);
                return (
                  <li key={ing.id}>
                    <button
                      type="button"
                      onClick={() => toggle(key)}
                      className={`flex w-full items-baseline gap-3 px-4 py-3 text-left ${big} ${
                        ticked ? "text-muted line-through" : ""
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-1 inline-block h-4 w-4 shrink-0 self-start rounded border ${
                          ticked ? "border-ok bg-ok" : "border-line"
                        }`}
                      />
                      {qty && <span className="min-w-16 font-semibold">{qty}</span>}
                      <span>{text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="label">Method</h2>
        <ol className="mt-3 space-y-3">
          {recipe.steps.map((step, i) => {
            const key = `s:${i}`;
            const ticked = done.has(key);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={`flex w-full gap-4 rounded-2xl border border-line bg-surface p-4 text-left leading-relaxed ${big} ${
                    ticked ? "text-muted opacity-60" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold ${
                      ticked ? "bg-ok text-white" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {ticked ? "✓" : i + 1}
                  </span>
                  <span>{step}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {recipe.notes && (
        <section className="mt-8">
          <h2 className="label">Notes</h2>
          <p className={`mt-2 whitespace-pre-line ${big}`}>{recipe.notes}</p>
        </section>
      )}

      {!cooking && (
        <footer className="mt-10 border-t border-line pt-5">
          <p className="text-sm text-muted">
            Source:{" "}
            {recipe.sourceUrl ? (
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                {recipe.sourceLabel || recipe.sourceUrl}
              </a>
            ) : (
              recipe.sourceLabel || "added by hand"
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/recipes/${recipe.id}/edit`} className="btn-ghost">
              Edit
            </Link>
            {hasOriginal && recipe.sources.length > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setShowOriginal((s) => !s)}>
                {showOriginal ? "Hide original" : "View original"}
              </button>
            )}
          </div>
          {showOriginal && (
            <div className="mt-4 space-y-3">
              {recipe.sources.map((key) => (
                <a key={key} href={`/api/images/${key}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private image route */}
                  <img
                    src={`/api/images/${key}`}
                    alt="Original recipe photo"
                    className="w-full rounded-2xl border border-line"
                  />
                </a>
              ))}
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
