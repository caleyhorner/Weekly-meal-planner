"use client";

import { useEffect, useRef, useState } from "react";
import { RecipeCover } from "./recipe-cover";
import {
  cropFromPhotosAction,
  saveWebPictureAction,
  searchWebPicturesAction,
  type WebPicture,
} from "@/app/(app)/recipes/picture-actions";

type Found<T> = { state: "loading" } | { state: "done"; items: T[] } | { state: "error"; message: string };

const tile = "h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4";

/**
 * "Find a better picture": cuts the dish photo out of the recipe's own photos (a cookbook
 * page often has one) and looks online for photos of the same dish.
 */
export function PictureFinder({
  recipe,
  current,
  onPick,
  onClose,
}: {
  recipe: { title: string; sourceLabel: string; description: string; sourceUrl: string | null; sourceImages: string[] };
  current: string | null;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const hasPhotos = recipe.sourceImages.length > 0;
  const [crops, setCrops] = useState<Found<string>>({ state: "loading" });
  const [web, setWeb] = useState<Found<WebPicture>>({ state: "loading" });
  const [saved, setSaved] = useState<Record<string, string>>({}); // web image URL -> stored key
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const started = useRef(false);
  // Read once when the panel opens; editing the title afterwards shouldn't restart the search.
  const [recipeAtOpen] = useState(recipe);

  const search = () => {
    const r = recipeAtOpen;
    setWeb({ state: "loading" });
    searchWebPicturesAction({
      title: r.title,
      sourceLabel: r.sourceLabel,
      description: r.description,
      sourceUrl: r.sourceUrl,
    })
      .then((res) =>
        setWeb("error" in res ? { state: "error", message: res.error } : { state: "done", items: res.pictures }),
      )
      .catch(() => setWeb({ state: "error", message: "Couldn't search the web just now." }));
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const r = recipeAtOpen;
    if (r.sourceImages.length) {
      cropFromPhotosAction(r.sourceImages, r.title)
        .then((res) =>
          setCrops("error" in res ? { state: "error", message: res.error } : { state: "done", items: res.keys }),
        )
        .catch(() => setCrops({ state: "error", message: "Couldn't look through the recipe photos just now." }));
    }
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, when the panel opens
  }, []);

  const pickWeb = async (p: WebPicture) => {
    setSaveError("");
    if (saved[p.imageUrl]) return onPick(saved[p.imageUrl]);
    setSaving(p.imageUrl);
    try {
      const res = await saveWebPictureAction(p.imageUrl);
      if ("error" in res) setSaveError(res.error);
      else {
        setSaved((s) => ({ ...s, [p.imageUrl]: res.key }));
        onPick(res.key);
      }
    } catch {
      setSaveError("That picture couldn't be added. Try another.");
    } finally {
      setSaving(null);
    }
  };

  const webItems = web.state === "done" ? web.items.filter((p) => !broken.has(p.imageUrl)) : [];
  // e.g. the API key is missing: say it once, not under both headings.
  const sameError = crops.state === "error" && web.state === "error" && crops.message === web.message;

  return (
    <div className="card mt-3 space-y-4 p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">Better pictures</h3>
        <button type="button" className="text-sm font-bold text-accent" onClick={onClose}>
          Done
        </button>
      </div>

      {hasPhotos && !sameError && (
        <section>
          <h4 className="text-sm text-muted">From the recipe photos</h4>
          {crops.state === "loading" && <p className="mt-1 text-[15px]">Looking for a photo of the dish on the page…</p>}
          {crops.state === "error" && <p className="mt-1 text-sm text-danger">{crops.message}</p>}
          {crops.state === "done" && crops.items.length === 0 && (
            <p className="mt-1 text-[15px]">There&apos;s no photo of the finished dish on those pages.</p>
          )}
          {crops.state === "done" && crops.items.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {crops.items.map((key) => (
                <button
                  type="button"
                  key={key}
                  aria-label="Use this photo"
                  aria-pressed={current === key}
                  onClick={() => onPick(key)}
                  className={`${tile} ${current === key ? "border-accent" : "border-transparent"}`}
                >
                  <RecipeCover imageKey={key} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h4 className="text-sm text-muted">From the web</h4>
        {web.state === "loading" && (
          <p className="mt-1 text-[15px]">Searching for “{recipeAtOpen.title}”… this can take half a minute.</p>
        )}
        {web.state === "error" && <p className="mt-1 text-sm text-danger">{web.message}</p>}
        {web.state === "done" && webItems.length === 0 && (
          <p className="mt-1 text-[15px]">Nothing good turned up online.</p>
        )}
        {webItems.length > 0 && (
          <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {webItems.map((p) => {
              const chosen = !!saved[p.imageUrl] && current === saved[p.imageUrl];
              return (
                <li key={p.imageUrl} className="w-24 shrink-0">
                  <button
                    type="button"
                    aria-label={`Use the photo from ${p.site}`}
                    aria-pressed={chosen}
                    disabled={saving !== null}
                    onClick={() => pickWeb(p)}
                    className={`${tile} relative ${chosen ? "border-accent" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- picture hosted by the recipe website */}
                    <img
                      src={p.imageUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onError={() => setBroken((b) => new Set(b).add(p.imageUrl))}
                      className="h-full w-full object-cover"
                    />
                    {saving === p.imageUrl && (
                      <span className="absolute inset-0 flex items-center justify-center bg-bg/70 text-sm font-bold">
                        Adding…
                      </span>
                    )}
                  </button>
                  <a
                    href={p.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={p.pageTitle}
                    className="mt-1 block truncate text-xs text-muted underline"
                  >
                    {p.site}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        {saveError && <p className="mt-1 text-sm text-danger">{saveError}</p>}
        {web.state !== "loading" && (
          <button type="button" className="btn mt-2 bg-surface-2 text-ink" onClick={search}>
            Search again
          </button>
        )}
      </section>
      <p className="text-xs text-muted">Tap one to use it. Tap a website&apos;s name to see where the picture came from.</p>
    </div>
  );
}
