"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { capitalise, groceriesText, type ShoppingItem } from "@/lib/shopping";
import { addStapleAction, mergeItemsAction, sendToOpenClawAction, setHaveItAction } from "./actions";

type Item = ShoppingItem & { haveIt: boolean };

function ItemMenu({
  item,
  others,
  onDone,
}: {
  item: Item;
  others: string[];
  onDone: (fn: () => Promise<unknown>) => void;
}) {
  const [mergeInto, setMergeInto] = useState("");
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-bg p-3">
      <button
        type="button"
        className="btn-ghost justify-start"
        onClick={() => onDone(() => addStapleAction(item.item))}
      >
        We always have {item.item}: leave it off every week
      </button>
      {others.length > 0 && (
        <div>
          <label htmlFor={`merge-${item.item}`} className="mb-1.5 block text-[15px] font-bold">
            Same thing as another item?
          </label>
          <div className="flex gap-2">
            <select
              id={`merge-${item.item}`}
              className="input"
              value={mergeInto}
              onChange={(e) => setMergeInto(e.target.value)}
            >
              <option value="">Choose…</option>
              {others.map((o) => (
                <option key={o} value={o}>
                  {capitalise(o)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={!mergeInto}
              onClick={() => onDone(() => mergeItemsAction(item.item, mergeInto))}
            >
              Merge
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">The app remembers this for future weeks.</p>
        </div>
      )}
    </div>
  );
}

export function ShoppingList({
  weekStart,
  dinners,
  items,
  canSendToOpenClaw,
}: {
  weekStart: string;
  dinners: number;
  items: Item[];
  canSendToOpenClaw: boolean;
}) {
  const [, startTransition] = useTransition();
  // Optimistic "have it" ticks, so tapping feels instant.
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<"copied" | "failed" | null>(null);
  const [sending, startSending] = useTransition();
  const [sent, setSent] = useState<{ ok: boolean; message: string } | null>(null);
  // The share sheet (straight to Telegram) only exists on some browsers, mostly phones.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => "share" in navigator,
    () => false,
  );

  const isHave = (i: Item) => have[i.item] ?? i.haveIt;
  const toBuy = items.filter((i) => !isHave(i));
  const text = useMemo(() => groceriesText(toBuy), [toBuy]);

  const groups = useMemo(() => {
    const g: { category: string; items: Item[] }[] = [];
    for (const i of items) {
      const last = g.at(-1);
      if (last && last.category === i.category) last.items.push(i);
      else g.push({ category: i.category, items: [i] });
    }
    return g;
  }, [items]);

  const toggle = (i: Item) => {
    const next = !isHave(i);
    setHave((h) => ({ ...h, [i.item]: next }));
    startTransition(async () => {
      await setHaveItAction(weekStart, i.item, next);
    });
  };

  const run = (fn: () => Promise<unknown>) => {
    setOpen(null);
    startTransition(async () => void (await fn()));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 4000);
  };

  const sendToOpenClaw = () => {
    setSent(null);
    startSending(async () => {
      try {
        const res = await sendToOpenClawAction(weekStart);
        setSent(
          res.ok
            ? { ok: true, message: "Sent. OpenClaw is adding it to Groceries in Reminders." }
            : { ok: false, message: res.error },
        );
      } catch {
        setSent({ ok: false, message: "Couldn't send. Check your connection and try again." });
      }
    });
  };

  const share = async () => {
    try {
      await navigator.share({ text });
    } catch {
      /* dismissed */
    }
  };

  return (
    <div>
      <p className="mt-3 text-[17px]">
        From {dinners} {dinners === 1 ? "dinner" : "dinners"}. Untick anything you already have, then
        send the list to Telegram.
      </p>

      {groups.map((g) => (
        <section key={g.category} aria-labelledby={`cat-${g.category}`} className="mt-5">
          <h2 id={`cat-${g.category}`} className="mb-2 px-1 text-lg font-extrabold">
            {g.category}
          </h2>
          <ul className="card divide-y divide-line">
            {g.items.map((i) => {
              const owned = isHave(i);
              const qty = i.quantities.join(" + ");
              return (
                <li key={i.item} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      id={`buy-${i.item}`}
                      type="checkbox"
                      checked={!owned}
                      onChange={() => toggle(i)}
                      className="mt-1 h-6 w-6 shrink-0 accent-[var(--accent)]"
                    />
                    <label htmlFor={`buy-${i.item}`} className={`min-w-0 flex-1 ${owned ? "text-done" : ""}`}>
                      <span className={`text-lg font-bold ${owned ? "line-through" : ""}`}>{capitalise(i.item)}</span>
                      {qty && <span className={`ml-2 text-lg ${owned ? "line-through" : ""}`}>{qty}</span>}
                      <span className="block text-[15px] text-muted">
                        {owned ? "Already have it. " : ""}For {i.recipes.join(", ")}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-bg"
                      aria-label={`More options for ${i.item}`}
                      aria-expanded={open === i.item}
                      onClick={() => setOpen(open === i.item ? null : i.item)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>
                  </div>
                  {open === i.item && (
                    <ItemMenu
                      item={i}
                      others={items.map((o) => o.item).filter((o) => o !== i.item)}
                      onDone={run}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div
        className="sticky bottom-[84px] z-10 mt-6 rounded-[20px] bg-ink p-3 text-bg sm:bottom-4"
        role="region"
        aria-label="Send the list"
      >
        <p className="px-1 pb-2 font-bold" aria-live="polite">
          {sending
            ? "Sending to OpenClaw…"
            : sent
              ? sent.message
              : copied === "copied"
            ? "Copied. Paste it into your Telegram chat with OpenClaw."
            : copied === "failed"
              ? "Couldn't copy automatically. Use Share instead, or select the text below."
                : `${toBuy.length} ${toBuy.length === 1 ? "thing" : "things"} to buy`}
        </p>
        {canSendToOpenClaw && (
          <button
            type="button"
            className="btn mb-2 w-full bg-lemon text-lemon-ink"
            onClick={sendToOpenClaw}
            disabled={!toBuy.length || sending}
          >
            {sending ? "Sending…" : "Send to OpenClaw"}
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn flex-1 ${canSendToOpenClaw ? "bg-surface text-ink" : "bg-lemon text-lemon-ink"}`}
            onClick={copy}
            disabled={!toBuy.length}
          >
            Copy for Telegram
          </button>
          {canShare && (
            <button type="button" className="btn bg-surface text-ink" onClick={share} disabled={!toBuy.length}>
              Share
            </button>
          )}
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer px-1 font-bold">See the text that gets copied</summary>
        <pre className="card mt-2 overflow-x-auto p-4 font-sans text-base whitespace-pre-wrap select-all">{text}</pre>
      </details>
    </div>
  );
}
