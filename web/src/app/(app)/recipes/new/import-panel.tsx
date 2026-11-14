"use client";

import { useRef, useState, useTransition } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { emptyRecipe, type RecipeInput } from "@/lib/recipe-model";
import { importRecipeAction } from "./actions";

const MAX_EDGE = 1568; // larger than this gains nothing for the AI and costs more

/** Shrinks a photo in the browser so uploads are quick and cheap. */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85),
  );
}

type Photo = { id: string; blob: Blob; preview: string };

export function ImportPanel() {
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [askForScreenshot, setAskForScreenshot] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeInput | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    const added: Photo[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const blob = await resizeImage(file);
        added.push({ id: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob) });
      } catch {
        setError("One of those photos couldn't be opened. HEIC photos may need converting.");
      }
    }
    setPhotos((p) => [...p, ...added].slice(0, 6));
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = () => {
    setError("");
    setWarning(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("link", link);
      fd.set("text", text);
      photos.forEach((p, i) => fd.append("photos", p.blob, `photo-${i + 1}.jpg`));
      try {
        const res = await importRecipeAction(fd);
        if (res.ok) {
          setDraft(res.draft);
          setWarning(res.warning);
          window.scrollTo({ top: 0 });
        } else {
          setError(res.error);
          setAskForScreenshot(res.askForScreenshot);
        }
      } catch {
        setError("Something went wrong talking to the server. Check your connection and try again.");
      }
    });
  };

  if (draft) {
    return (
      <div>
        <div className="mx-auto mb-5 max-w-2xl">
          <h1 className="font-serif text-3xl font-semibold">Check it over</h1>
          <p className="mt-1 text-muted">
            Fix anything the AI misread, then save. Tap an ingredient to edit it.
          </p>
          {warning && (
            <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent">{warning}</p>
          )}
        </div>
        <RecipeForm initial={draft} onBack={() => setDraft(null)} />
      </div>
    );
  }

  const hasInput = link.trim() || text.trim() || photos.length > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-serif text-3xl font-semibold">Add a recipe</h1>
      <p className="mt-1 text-muted">
        Photos of cookbook pages, screenshots, a link or pasted text. Any mix works.
      </p>

      <section className="mt-6">
        <h2 className="label">Photos or screenshots</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview blob */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white"
                onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={`flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm font-semibold ${
                askForScreenshot ? "border-accent text-accent" : "border-line text-muted"
              }`}
            >
              <span className="text-3xl leading-none">+</span>
              {photos.length ? "Add page" : "Add photo"}
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <p className="mt-1 text-xs text-muted">
          Two-page recipe? Add both pages. Up to 6 photos.
        </p>
      </section>

      <section className="mt-6">
        <label className="label" htmlFor="link">
          Link
        </label>
        <input
          id="link"
          className="input"
          type="url"
          inputMode="url"
          placeholder="Recipe website or Instagram post"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </section>

      <section className="mt-6">
        <label className="label" htmlFor="text">
          Or paste the text
        </label>
        <textarea
          id="text"
          className="input"
          rows={5}
          placeholder="e.g. copy an Instagram caption and paste it here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn-primary flex-1 py-3" onClick={submit} disabled={!hasInput || pending}>
          {pending ? "Reading the recipe… (about 30 seconds)" : "Read recipe"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setDraft({ ...emptyRecipe(), sourceUrl: link || null })}
          disabled={pending}
        >
          Type it in myself
        </button>
      </div>
    </div>
  );
}
