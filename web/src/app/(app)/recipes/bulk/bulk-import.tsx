"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resizeImage } from "@/lib/resize-image";
import { bulkImportOneAction, type BulkResult } from "./actions";

const AT_ONCE = 3;

type Status = "waiting" | "reading" | "saved" | "duplicate" | "failed";
type Item = {
  key: string;
  label: string;
  link?: string;
  file?: File;
  status: Status;
  message?: string;
  recipeId?: string;
};

/** Same link ignoring tracking bits (?utm_…, #…) and a trailing slash. */
const linkKey = (u: string) => u.replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();

/** Pulls every web link out of pasted text (a list, a note, a message thread), without repeats. */
function findLinks(text: string): string[] {
  const found = (text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? []).map((u) => u.replace(/[.,;:!?]+$/, ""));
  const seen = new Set<string>();
  return found.filter((u) => !seen.has(linkKey(u)) && seen.add(linkKey(u)));
}

const STATUS_TEXT: Record<Status, string> = {
  waiting: "Waiting",
  reading: "Reading…",
  saved: "Saved",
  duplicate: "Already have it",
  failed: "Didn't work",
};

export function BulkImport() {
  const [linksText, setLinksText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((all) => all.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const addLinks = () => {
    const links = findLinks(linksText);
    setItems((all) => {
      const have = new Set(all.filter((i) => i.link).map((i) => linkKey(i.link!)));
      const fresh = links
        .filter((l) => !have.has(linkKey(l)))
        .map((l): Item => ({ key: crypto.randomUUID(), label: l, link: l, status: "waiting" }));
      return [...all, ...fresh];
    });
    setLinksText("");
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const fresh = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f): Item => ({ key: crypto.randomUUID(), label: f.name, file: f, status: "waiting" }));
    setItems((all) => [...all, ...fresh]);
    if (fileInput.current) fileInput.current.value = "";
  };

  // Keep the screen on and warn before leaving while importing.
  useEffect(() => {
    if (!running) return;
    let lock: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then((l) => (lock = l), () => {});
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      lock?.release();
    };
  }, [running]);

  const importOne = async (item: Item) => {
    update(item.key, { status: "reading", message: undefined });
    try {
      const fd = new FormData();
      if (item.link) fd.set("link", item.link);
      if (item.file) {
        const blob = await resizeImage(item.file);
        fd.set("photo", blob, "photo.jpg");
      }
      const res: BulkResult = await bulkImportOneAction(fd);
      if (res.status === "saved") {
        update(item.key, { status: "saved", label: res.title, recipeId: res.id, message: res.note ?? undefined });
      } else if (res.status === "duplicate") {
        update(item.key, { status: "duplicate", message: `Matches “${res.title}”`, recipeId: res.id });
      } else {
        update(item.key, { status: "failed", message: res.error });
      }
    } catch {
      update(item.key, {
        status: "failed",
        message: item.file
          ? "Couldn't send this photo (it may be HEIC or too large), or the connection dropped."
          : "Couldn't reach the server. Check the connection and retry.",
      });
    }
  };

  const start = async (only?: Status) => {
    const queue = items.filter((i) => i.status === (only ?? "waiting"));
    if (!queue.length) return;
    setRunning(true);
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const item = queue[next++];
        await importOne(item);
      }
    };
    await Promise.all(Array.from({ length: Math.min(AT_ONCE, queue.length) }, worker));
    setRunning(false);
  };

  const count = (s: Status) => items.filter((i) => i.status === s).length;
  const done = count("saved") + count("duplicate") + count("failed");
  const total = items.length;
  const finished = total > 0 && !running && count("waiting") === 0 && count("reading") === 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/recipes/new" className="inline-flex min-h-11 items-center gap-1.5 font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Add one recipe instead
      </Link>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold">Bulk import</h1>
      <p className="mt-1 text-[17px] text-muted">
        Add all your links and photos, then press Start. Each one is read and saved as its own recipe, marked
        <strong> To check</strong> so you can look them over later. One photo makes one recipe.
      </p>

      {!running && (
        <>
          <section className="mt-6">
            <label htmlFor="links" className="label">
              Links
            </label>
            <textarea
              id="links"
              className="input"
              rows={5}
              placeholder="Paste as many links as you like: one per line, or a whole note with links in it"
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
            />
            <button type="button" className="btn-ghost mt-2" onClick={addLinks} disabled={!findLinks(linksText).length}>
              Add {findLinks(linksText).length || ""} {findLinks(linksText).length === 1 ? "link" : "links"}
            </button>
          </section>

          <section className="mt-6">
            <h2 className="label">Photos</h2>
            <button type="button" className="btn-ghost" onClick={() => fileInput.current?.click()}>
              Choose photos
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addPhotos(e.target.files)}
            />
            <p className="mt-1 text-sm text-muted">Select as many as you like from your camera roll.</p>
          </section>
        </>
      )}

      {total > 0 && (
        <section className="mt-6" aria-live="polite">
          <div className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-bold">
                {running ? `Reading recipes: ${done} of ${total} done` : finished ? "All done" : `${total} ready to import`}
              </p>
              {total > 0 && <p className="text-[15px] text-muted">{Math.round((done / total) * 100)}%</p>}
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            {running && (
              <p className="mt-2 text-[15px] text-muted">
                Keep this page open. Each recipe takes about 30 seconds; {AT_ONCE} are read at a time.
              </p>
            )}
            {finished && (
              <p className="mt-2 text-[15px]">
                {count("saved")} saved
                {count("duplicate") ? `, ${count("duplicate")} already in your recipes` : ""}
                {count("failed") ? `, ${count("failed")} didn't work` : ""}.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {!running && count("waiting") > 0 && (
                <button type="button" className="btn-primary" onClick={() => start()}>
                  Start importing {count("waiting")}
                </button>
              )}
              {finished && count("failed") > 0 && (
                <button type="button" className="btn-ghost bg-bg" onClick={() => start("failed")}>
                  Try the failed ones again
                </button>
              )}
              {finished && count("saved") > 0 && (
                <Link href="/recipes?check=1" className="btn-primary">
                  Check the new recipes
                </Link>
              )}
            </div>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {items.map((i) => (
              <li key={i.key} className="card flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                    i.status === "saved"
                      ? "bg-accent"
                      : i.status === "failed"
                        ? "bg-danger"
                        : i.status === "reading"
                          ? "animate-pulse bg-lemon"
                          : "bg-surface-2"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  {i.recipeId ? (
                    <Link href={`/recipes/${i.recipeId}`} className="block truncate font-bold underline" target="_blank">
                      {i.label}
                    </Link>
                  ) : (
                    <span className="block truncate font-bold">{i.file ? `Photo: ${i.label}` : i.label}</span>
                  )}
                  <span className="block text-[15px] text-muted">
                    {STATUS_TEXT[i.status]}
                    {i.message ? `. ${i.message}` : ""}
                  </span>
                </span>
                {!running && i.status === "waiting" && (
                  <button
                    type="button"
                    className="-mr-2 h-10 w-10 shrink-0 rounded-xl text-xl text-muted hover:bg-bg"
                    aria-label={`Remove ${i.label}`}
                    onClick={() => setItems((all) => all.filter((x) => x.key !== i.key))}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
