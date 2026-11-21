"use client";

import { useState, useTransition } from "react";
import { relativeDays } from "@/lib/format";
import { addSourceAction, checkSourceAction, removeSourceAction } from "../recipes/feed-actions";

type Source = {
  id: string;
  name: string;
  siteUrl: string;
  lastCheckedAt: Date | null;
  lastError: string | null;
  waiting: number;
};

function checkedLabel(d: Date | null) {
  if (!d) return "Not checked yet";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60_000);
  if (mins < 2) return "Checked just now";
  if (mins < 60) return `Checked ${mins} minutes ago`;
  if (mins < 24 * 60) return `Checked ${Math.round(mins / 60)} hours ago`;
  return `Checked ${relativeDays(new Date(d).toISOString().slice(0, 10))}`;
}

/** The recipe websites the "For you" feed reads from. */
export function Websites({ sources }: { sources: Source[] }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const add = () => {
    if (!url.trim()) return;
    setMessage(null);
    setBusy("add");
    startTransition(async () => {
      const res = await addSourceAction(url);
      setBusy(null);
      if ("error" in res) setMessage({ ok: false, text: res.error });
      else {
        setUrl("");
        setMessage(
          res.problem
            ? { ok: false, text: `Added ${res.name}, but: ${res.problem}` }
            : { ok: true, text: `Added ${res.name} and found ${res.added} recipes.` },
        );
      }
    });
  };

  const check = (s: Source) => {
    setMessage(null);
    setBusy(s.id);
    startTransition(async () => {
      const res = await checkSourceAction(s.id);
      setBusy(null);
      if (res) {
        setMessage(
          res.error
            ? { ok: false, text: `${s.name}: ${res.error}` }
            : { ok: true, text: `${s.name}: found ${res.added} new ${res.added === 1 ? "recipe" : "recipes"}.` },
        );
      }
    });
  };

  return (
    <section id="websites" aria-labelledby="websites-heading" className="card scroll-mt-20 p-4">
      <h2 id="websites-heading" className="text-[22px] font-extrabold">
        Recipe websites
      </h2>
      <p className="mt-1 text-muted">
        Checked every morning for new recipes. The ones that suit you show under <strong>For you</strong> on the
        Recipes page.
      </p>

      <ul className="mt-3 divide-y divide-line">
        {sources.map((s) => (
          <li key={s.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a href={s.siteUrl} target="_blank" rel="noreferrer" className="font-bold underline">
                  {s.name}
                </a>
                <p className="text-[15px] text-muted">
                  {checkedLabel(s.lastCheckedAt)}. {s.waiting} {s.waiting === 1 ? "suggestion" : "suggestions"} waiting.
                </p>
                {s.lastError && <p className="text-[15px] text-danger">{s.lastError}</p>}
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn-ghost bg-bg" disabled={busy !== null} onClick={() => check(s)}>
                {busy === s.id ? "Checking… (up to a minute)" : "Check now"}
              </button>
              <button
                type="button"
                className="btn-ghost bg-bg"
                disabled={busy !== null}
                onClick={() => {
                  if (confirm(`Stop getting suggestions from ${s.name}?`)) startTransition(() => removeSourceAction(s.id));
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor="new-site" className="sr-only">
          Add a recipe website
        </label>
        <input
          id="new-site"
          className="input bg-bg"
          inputMode="url"
          placeholder="e.g. taste.com.au"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={busy !== null}>
          {busy === "add" ? "Adding…" : "Add"}
        </button>
      </form>
      {message && (
        <p role="status" className={`mt-2 text-[15px] ${message.ok ? "text-accent" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
