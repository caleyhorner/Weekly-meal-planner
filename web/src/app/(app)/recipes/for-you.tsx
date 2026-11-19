"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Suggestion } from "@/lib/feed/data";
import { formatMinutes } from "@/lib/format";
import { dismissSuggestionAction, planSuggestionAction, saveSuggestionAction } from "./feed-actions";

export type PlanDay = { date: string; label: string; planned: string | null };

type CardState =
  | { kind: "idle" }
  | { kind: "busy"; text: string }
  | { kind: "done"; text: string; recipeId: string }
  | { kind: "error"; text: string };

function Card({ s, days, onDismiss }: { s: Suggestion; days: PlanDay[]; onDismiss: () => void }) {
  const [state, setState] = useState<CardState>({ kind: "idle" });
  const [choosing, setChoosing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [, startTransition] = useTransition();
  const busy = state.kind === "busy";

  const save = () => {
    setState({ kind: "busy", text: "Saving… (about 30 seconds)" });
    startTransition(async () => {
      const res = await saveSuggestionAction(s.id);
      setState(res.ok ? { kind: "done", text: "Saved to your recipes", recipeId: res.recipeId } : { kind: "error", text: res.error });
    });
  };

  const plan = (date: string) => {
    setChoosing(false);
    setState({ kind: "busy", text: "Saving and planning… (about 30 seconds)" });
    startTransition(async () => {
      const res = await planSuggestionAction(s.id, date);
      setState(
        res.ok
          ? { kind: "done", text: res.message ?? "Planned", recipeId: res.recipeId }
          : { kind: "error", text: res.error },
      );
    });
  };

  return (
    <li className="card flex w-[272px] shrink-0 snap-start flex-col overflow-hidden">
      <a href={s.url} target="_blank" rel="noreferrer" className="block">
        <div className="aspect-[4/3] bg-surface-2">
          {s.imageUrl && !imageFailed && (
            // eslint-disable-next-line @next/next/no-img-element -- picture hosted by the recipe website
            <img
              src={s.imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="px-4 pt-3">
          <h3 className="line-clamp-2 text-lg leading-snug font-bold">{s.title}</h3>
          <p className="mt-0.5 text-[15px] text-muted">
            {[s.sourceName, formatMinutes(s.totalMinutes)].filter(Boolean).join(", ")}
          </p>
        </div>
      </a>
      <p className="mx-4 mt-2 rounded-xl bg-bg px-3 py-2 text-[15px] font-bold">{s.reason}</p>

      <div className="mt-auto px-4 pt-3 pb-4">
        {state.kind === "done" ? (
          <p className="text-[15px] font-bold text-accent">
            {state.text}.{" "}
            <Link href={`/recipes/${state.recipeId}`} className="underline">
              Open it
            </Link>
          </p>
        ) : state.kind === "busy" ? (
          <p className="animate-pulse text-[15px] font-bold">{state.text}</p>
        ) : choosing ? (
          <div>
            <p className="mb-1.5 text-[15px] font-bold">Which night?</p>
            <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {days.map((d) => (
                <li key={d.date}>
                  <button
                    type="button"
                    onClick={() => plan(d.date)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-bg px-3 text-left hover:bg-surface-2"
                  >
                    <span className="font-bold">{d.label}</span>
                    <span className="truncate text-sm text-muted">{d.planned ? `instead of ${d.planned}` : "free"}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-2 text-[15px] font-bold underline" onClick={() => setChoosing(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <>
            {state.kind === "error" && <p className="mb-2 text-sm text-danger">{state.text}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-primary px-2" onClick={save} disabled={busy}>
                Save
              </button>
              <button type="button" className="btn-ghost bg-bg px-2" onClick={() => setChoosing(true)} disabled={busy}>
                Plan it
              </button>
            </div>
            <button type="button" className="mt-2 min-h-11 w-full text-[15px] font-bold text-muted" onClick={onDismiss}>
              Not for us
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** "For you": recipes from your chosen websites that suit how you cook. */
export function ForYou({
  suggestions,
  days,
  sources,
}: {
  suggestions: Suggestion[];
  days: PlanDay[];
  sources: number;
}) {
  const [shown, setShown] = useState(suggestions);
  const [, startTransition] = useTransition();

  const dismiss = (id: string) => {
    setShown((all) => all.filter((s) => s.id !== id));
    startTransition(() => dismissSuggestionAction(id));
  };

  return (
    <section aria-labelledby="for-you" className="mt-5">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="for-you" className="text-2xl font-extrabold">
          For you
        </h2>
        <Link href="/settings#websites" className="text-[15px] font-bold underline">
          Websites
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="card mt-2 p-4 text-[17px]">
          {sources === 0 ? (
            <>
              Add your favourite recipe websites in{" "}
              <Link href="/settings#websites" className="font-bold underline">
                Settings
              </Link>{" "}
              and new recipes that suit you will show up here.
            </>
          ) : (
            <>
              New suggestions arrive each morning from your recipe websites. To look now, use{" "}
              <Link href="/settings#websites" className="font-bold underline">
                Check now
              </Link>{" "}
              in Settings.
            </>
          )}
        </p>
      ) : (
        <ul className="-mx-4 mt-2 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2">
          {shown.map((s) => (
            <Card key={s.id} s={s} days={days} onDismiss={() => dismiss(s.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}
