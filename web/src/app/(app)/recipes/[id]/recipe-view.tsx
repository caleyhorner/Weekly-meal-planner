"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function ingredientLine(ing: ViewIngredient, factor: number) {
  // Nothing to scale ("salt, to taste"): show what the recipe said.
  if (ing.amount == null) return { qty: "", text: ing.raw };
  return { qty: formatQuantity(ing.amount * factor, ing.unit), text: describeIngredient(ing) };
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
        /* refused, e.g. low battery */
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
  const [currentStep, setCurrentStep] = useState(0);
  const [gotIt, setGotIt] = useState<Set<string>>(new Set());
  const [showOriginal, setShowOriginal] = useState(false);
  useWakeLock(cooking);

  const factor = servings / recipe.servings;
  const groups = useMemo(() => groupIngredients(recipe.ingredients), [recipe.ingredients]);
  const servingOptions = useMemo(
    () => [...new Set([2, 4, 6, 8, recipe.servings])].sort((a, b) => a - b),
    [recipe.servings],
  );

  const toggleIngredient = (id: string) =>
    setGotIt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const startStopCooking = () => {
    setCooking((c) => !c);
    setCurrentStep(0);
    setGotIt(new Set());
  };

  const prep = formatMinutes(recipe.prepMinutes);
  const cook = formatMinutes(recipe.cookMinutes);
  const cooked = relativeDays(recipe.lastCooked);
  const timing = [prep && `${prep} prep`, cook && `${cook} cook`].filter(Boolean).join(" and ");
  const total = recipe.steps.length;

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/recipes" className="inline-flex min-h-11 items-center gap-1.5 self-start font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Recipes
      </Link>

      {recipe.heroImage && !cooking && (
        // eslint-disable-next-line @next/next/no-img-element -- private image served by our own route
        <img
          src={`/api/images/${recipe.heroImage}`}
          alt=""
          className="aspect-[16/9] w-full rounded-[20px] object-cover"
        />
      )}

      <header>
        <h1 className="text-[34px] leading-tight font-extrabold">{recipe.title}</h1>
        <p className="mt-2 text-[17px] text-muted">
          {[timing && `${timing}.`, cooked ? `Last had ${cooked}.` : "Not tried yet."]
            .filter(Boolean)
            .join(" ")}
        </p>
        {recipe.description && !cooking && <p className="mt-2 text-[17px]">{recipe.description}</p>}
        {recipe.tags.length > 0 && !cooking && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recipe.tags.map((t) => (
              <Link key={t} href={`/recipes?tag=${encodeURIComponent(t)}`} className="chip">
                {t}
              </Link>
            ))}
          </div>
        )}
      </header>

      <section aria-labelledby="servings-label" className="card p-3.5">
        <p id="servings-label" className="mb-2.5 font-bold">
          How many are eating?
        </p>
        <div
          role="group"
          aria-labelledby="servings-label"
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${servingOptions.length}, minmax(0, 1fr))` }}
        >
          {servingOptions.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={servings === n}
              onClick={() => setServings(n)}
              className={`h-13 rounded-[14px] border-2 text-xl font-bold transition-colors ${
                servings === n
                  ? "border-ink bg-ink text-bg"
                  : "border-surface-2 bg-surface hover:border-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {servings !== recipe.servings && (
          <p className="mt-2 text-[15px] text-muted">
            Amounts adjusted from the original, which serves {recipe.servings}.
          </p>
        )}
      </section>

      <button type="button" onClick={startStopCooking} className={cooking ? "btn-ghost" : "btn-primary"}>
        {cooking ? "Finish cooking" : "Start cooking"}
      </button>
      {cooking && (
        <p className="-mt-2 text-[15px] text-muted">
          The screen stays on. Tick off ingredients as you go and tap a step when you reach it.
        </p>
      )}

      <section aria-labelledby="ingredients-heading" className="card px-4 pt-4 pb-2">
        <h2 id="ingredients-heading" className="text-[22px] font-extrabold">
          Ingredients
        </h2>
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <h3 className="mt-4 mb-0.5 font-bold text-accent">{g.label}</h3>}
            <ul>
              {g.items.map((ing) => {
                const { qty, text } = ingredientLine(ing, factor);
                const ticked = cooking && gotIt.has(ing.id);
                const row = (
                  <>
                    <span className="text-2xl leading-none font-extrabold whitespace-nowrap tabular-nums">{qty}</span>
                    <span className="text-lg leading-snug">{text}</span>
                  </>
                );
                const rowClass = `grid w-full grid-cols-[112px_minmax(0,1fr)] items-baseline gap-3 border-t border-line py-2.5 text-left ${
                  ticked ? "text-done line-through" : ""
                }`;
                return (
                  <li key={ing.id}>
                    {cooking ? (
                      <button
                        type="button"
                        aria-pressed={ticked}
                        onClick={() => toggleIngredient(ing.id)}
                        className={rowClass}
                      >
                        {row}
                      </button>
                    ) : (
                      <div className={rowClass}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="method-heading">
        <div className="flex items-baseline justify-between px-1 pt-1.5 pb-2.5">
          <h2 id="method-heading" className="text-[22px] font-extrabold">
            Method
          </h2>
          {cooking && total > 0 && (
            <p className="font-bold text-muted" aria-live="polite">
              {currentStep < total ? `Step ${currentStep + 1} of ${total}` : "All done"}
            </p>
          )}
        </div>
        <ol className="flex flex-col gap-2">
          {recipe.steps.map((step, i) => {
            const done = cooking && i < currentStep;
            const now = cooking && i === currentStep;
            const body = (
              <>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold ${
                    now ? "bg-ink text-bg" : done ? "bg-surface-2" : "bg-bg"
                  }`}
                  aria-hidden={done}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span>{step}</span>
              </>
            );
            const cls = `grid w-full grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-[20px] p-4 text-left leading-relaxed transition-colors ${
              now ? "bg-lemon text-[21px] text-lemon-ink" : `bg-surface text-lg ${done ? "text-done" : ""}`
            }`;
            return (
              <li key={i}>
                {cooking ? (
                  <button
                    type="button"
                    aria-current={now ? "step" : undefined}
                    onClick={() => setCurrentStep(now ? i + 1 : i)}
                    className={cls}
                  >
                    {done && <span className="sr-only">Done: </span>}
                    {body}
                  </button>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>
        {cooking && currentStep < total && (
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => setCurrentStep((s) => s + 1)}
          >
            {currentStep === total - 1 ? "Done" : "Next step"}
          </button>
        )}
      </section>

      {recipe.notes && (
        <section aria-labelledby="notes-heading" className="card p-4">
          <h2 id="notes-heading" className="text-[22px] font-extrabold">
            Notes
          </h2>
          <p className="mt-2 text-lg whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      {!cooking && (
        <footer className="px-1 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-[15px] text-muted">
              {recipe.sourceUrl ? (
                <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  {recipe.sourceLabel || "Original link"}
                </a>
              ) : (
                recipe.sourceLabel || "Added by hand"
              )}
            </p>
            <div className="flex gap-4">
              {recipe.sources.length > 0 && (
                <button
                  type="button"
                  className="min-h-11 font-bold"
                  aria-expanded={showOriginal}
                  onClick={() => setShowOriginal((s) => !s)}
                >
                  {showOriginal ? "Hide the original" : "See the original"}
                </button>
              )}
              <Link href={`/recipes/${recipe.id}/edit`} className="flex min-h-11 items-center font-bold">
                Edit
              </Link>
            </div>
          </div>
          {showOriginal && (
            <div className="mt-3 flex flex-col gap-3">
              {recipe.sources.map((key) => (
                <a key={key} href={`/api/images/${key}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private image route */}
                  <img src={`/api/images/${key}`} alt="Original recipe photo" className="w-full rounded-[20px]" />
                </a>
              ))}
            </div>
          )}
        </footer>
      )}
    </article>
  );
}
