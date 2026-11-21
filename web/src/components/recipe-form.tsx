"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  CATEGORIES,
  UNITS,
  type Category,
  type IngredientInput,
  type RecipeInput,
} from "@/lib/recipe-model";
import { parseIngredientLine } from "@/lib/parse-ingredient";
import { formatQuantity } from "@/lib/format";
import { RecipeCover } from "./recipe-cover";
import { PictureFinder } from "./picture-finder";
import { resizeImage } from "@/lib/resize-image";
import {
  deleteRecipeAction,
  saveRecipeAction,
  similarTitlesAction,
  uploadPictureAction,
} from "@/app/(app)/recipes/actions";

function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function IngredientRow({
  ing,
  onChange,
  onRemove,
}: {
  ing: IngredientInput;
  onChange: (next: IngredientInput) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const summary = [formatQuantity(ing.amount, ing.unit), ing.item, ing.prep && `(${ing.prep})`]
    .filter(Boolean)
    .join(" ");
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 truncate py-1 text-left"
          onClick={() => setOpen((o) => !o)}
          title={ing.raw}
        >
          {summary}
          {ing.group && <span className="ml-2 text-xs text-muted">· {ing.group}</span>}
        </button>
        <button type="button" className="text-sm text-accent" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Edit"}
        </button>
        <button
          type="button"
          className="px-1 text-lg text-muted hover:text-danger"
          onClick={onRemove}
          aria-label={`Remove ${ing.item}`}
        >
          ×
        </button>
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 pb-2 sm:grid-cols-4">
          <label className="text-xs text-muted">
            Amount
            <input
              className="input mt-1"
              inputMode="decimal"
              defaultValue={ing.amount ?? ""}
              onChange={(e) => onChange({ ...ing, amount: numOrNull(e.target.value) })}
            />
          </label>
          <label className="text-xs text-muted">
            Unit
            <input
              className="input mt-1"
              list="unit-options"
              value={ing.unit ?? ""}
              onChange={(e) => onChange({ ...ing, unit: e.target.value || null })}
            />
          </label>
          <label className="col-span-2 text-xs text-muted">
            Shopping item
            <input
              className="input mt-1"
              value={ing.item}
              onChange={(e) => onChange({ ...ing, item: e.target.value })}
            />
          </label>
          <label className="col-span-2 text-xs text-muted">
            Prep note
            <input
              className="input mt-1"
              value={ing.prep ?? ""}
              placeholder="e.g. finely diced"
              onChange={(e) => onChange({ ...ing, prep: e.target.value || null })}
            />
          </label>
          <label className="text-xs text-muted">
            Group
            <input
              className="input mt-1"
              value={ing.group ?? ""}
              placeholder="e.g. Sauce"
              onChange={(e) => onChange({ ...ing, group: e.target.value || null })}
            />
          </label>
          <label className="text-xs text-muted">
            Aisle
            <select
              className="input mt-1"
              value={ing.category}
              onChange={(e) => onChange({ ...ing, category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <p className="col-span-2 text-xs text-muted sm:col-span-4">Original: “{ing.raw}”</p>
        </div>
      )}
    </li>
  );
}

export function RecipeForm({
  initial,
  recipeId,
  onBack,
  findPicture = false,
}: {
  initial: RecipeInput;
  recipeId?: string;
  /** Open "Find a better picture" straight away (from the recipe page's link). */
  findPicture?: boolean;
  /** Import flow: go back to the import box instead of leaving the page. */
  onBack?: () => void;
}) {
  const [r, setR] = useState<RecipeInput>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [newIngredient, setNewIngredient] = useState("");
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<{ id: string; title: string }[] | null>(null);
  const [pending, startTransition] = useTransition();
  // Picture choices: the chosen picture, the photos it was imported from, and any added here.
  const [pictureOptions, setPictureOptions] = useState(() =>
    [...new Set([initial.heroImage, ...initial.sourceImages].filter((k): k is string => !!k))],
  );
  const [uploading, setUploading] = useState(false);
  const [pictureError, setPictureError] = useState("");
  const pictureInput = useRef<HTMLInputElement>(null);
  const [finding, setFinding] = useState(findPicture);

  const choosePicture = (key: string) => {
    setPictureOptions((all) => (all.includes(key) ? all : [key, ...all]));
    set("heroImage", key);
  };

  const addPicture = async (file: File | undefined) => {
    if (!file) return;
    setPictureError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("photo", await resizeImage(file), "picture.jpg");
      const res = await uploadPictureAction(fd);
      if ("error" in res) setPictureError(res.error);
      else choosePicture(res.key);
    } catch {
      setPictureError("That photo couldn't be added. Try another, or a JPEG instead of HEIC.");
    } finally {
      setUploading(false);
      if (pictureInput.current) pictureInput.current.value = "";
    }
  };

  const set = <K extends keyof RecipeInput>(key: K, value: RecipeInput[K]) =>
    setR((prev) => ({ ...prev, [key]: value }));

  const setIngredient = (i: number, next: IngredientInput) =>
    set("ingredients", r.ingredients.map((x, j) => (j === i ? next : x)));

  const addIngredient = () => {
    if (!newIngredient.trim()) return;
    const lastGroup = r.ingredients.at(-1)?.group ?? null;
    set("ingredients", [...r.ingredients, parseIngredientLine(newIngredient, lastGroup)]);
    setNewIngredient("");
  };

  const finalInput = (): RecipeInput => ({
    ...r,
    tags: tagsText
      .split(/[,#]/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    steps: r.steps.map((s) => s.trim()).filter(Boolean),
  });

  const save = (skipDuplicateCheck = false) => {
    setError("");
    startTransition(async () => {
      const input = finalInput();
      if (!recipeId && !skipDuplicateCheck) {
        const similar = await similarTitlesAction(input.title);
        if (similar.length) {
          setDuplicates(similar);
          return;
        }
      }
      const res = await saveRecipeAction(input, recipeId);
      if (res?.error) setError(res.error);
    });
  };

  const remove = () => {
    if (!recipeId || !confirm(`Delete “${r.title}”? This can't be undone.`)) return;
    startTransition(() => deleteRecipeAction(recipeId));
  };

  return (
    <form
      className="mx-auto max-w-2xl space-y-6 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <datalist id="unit-options">
        {UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      <section aria-labelledby="picture-heading">
        <h2 id="picture-heading" className="label">
          Picture
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-labelledby="picture-heading">
          <button
            type="button"
            role="radio"
            aria-checked={r.heroImage === null}
            onClick={() => set("heroImage", null)}
            className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 ${
              r.heroImage === null ? "border-accent" : "border-transparent"
            }`}
          >
            <RecipeCover imageKey={null} />
          </button>
          {pictureOptions.map((key) => (
            <button
              type="button"
              key={key}
              role="radio"
              aria-checked={r.heroImage === key}
              aria-label="Use this photo"
              onClick={() => set("heroImage", key)}
              className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 ${
                r.heroImage === key ? "border-accent" : "border-transparent"
              }`}
            >
              <RecipeCover imageKey={key} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => pictureInput.current?.click()}
            disabled={uploading}
            className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-surface-2 bg-surface text-sm font-bold text-muted"
          >
            <span className="text-2xl leading-none">+</span>
            {uploading ? "Adding…" : "Add a photo"}
          </button>
          <input
            ref={pictureInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => addPicture(e.target.files?.[0])}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Shown at the top of the recipe and next to it in lists. A photo of the finished dish works best.
        </p>
        {pictureError && <p className="mt-1 text-sm text-danger">{pictureError}</p>}
        {finding ? (
          <PictureFinder
            recipe={{
              title: r.title,
              sourceLabel: r.sourceLabel,
              description: r.description,
              sourceUrl: r.sourceUrl,
              sourceImages: r.sourceImages,
            }}
            current={r.heroImage}
            onPick={choosePicture}
            onClose={() => setFinding(false)}
          />
        ) : (
          <button type="button" className="btn-ghost mt-2" onClick={() => setFinding(true)}>
            Find a better picture
          </button>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="input text-xl font-bold"
            value={r.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>
        <div role="radiogroup" aria-label="Type of recipe" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {(
            [
              ["dinner", "Dinner"],
              ["snack", "Snack"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={r.kind === value}
              onClick={() => set("kind", value)}
              className={`min-h-11 rounded-xl text-base ${r.kind === value ? "bg-surface font-bold shadow-sm" : "font-medium"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className="label" htmlFor="description">
            Short description
          </label>
          <textarea
            id="description"
            className="input"
            rows={2}
            value={r.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="servings">
              Serves
            </label>
            <input
              id="servings"
              className={`input ${!r.servings ? "border-danger" : ""}`}
              inputMode="numeric"
              value={r.servings || ""}
              onChange={(e) => set("servings", Number(e.target.value.replace(/\D/g, "")) || 0)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="prep">
              Prep (min)
            </label>
            <input
              id="prep"
              className="input"
              inputMode="numeric"
              value={r.prepMinutes ?? ""}
              onChange={(e) => set("prepMinutes", numOrNull(e.target.value.replace(/\D/g, "")))}
            />
          </div>
          <div>
            <label className="label" htmlFor="cook">
              Cook (min)
            </label>
            <input
              id="cook"
              className="input"
              inputMode="numeric"
              value={r.cookMinutes ?? ""}
              onChange={(e) => set("cookMinutes", numOrNull(e.target.value.replace(/\D/g, "")))}
            />
          </div>
        </div>
        {!r.servings && (
          <p className="text-sm text-danger">
            The recipe didn&apos;t say how many it serves. Please fill it in so the shopping list
            scales properly.
          </p>
        )}
        <div>
          <label className="label" htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            className="input"
            value={tagsText}
            placeholder="quick, kids love it, vegetarian"
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>
      </section>

      <section>
        <h2 className="label">Ingredients</h2>
        {r.ingredients.length > 0 && (
          <ul className="card divide-y divide-line">
            {r.ingredients.map((ing, i) => (
              <IngredientRow
                key={i}
                ing={ing}
                onChange={(next) => setIngredient(i, next)}
                onRemove={() => set("ingredients", r.ingredients.filter((_, j) => j !== i))}
              />
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <input
            className="input"
            value={newIngredient}
            placeholder="Add an ingredient, e.g. 2 tbsp olive oil"
            onChange={(e) => setNewIngredient(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addIngredient();
              }
            }}
          />
          <button type="button" className="btn-ghost shrink-0" onClick={addIngredient}>
            Add
          </button>
        </div>
      </section>

      <section>
        <h2 className="label">Method</h2>
        <ol className="space-y-2">
          {r.steps.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2.5 w-6 shrink-0 text-right font-semibold text-accent">
                {i + 1}
              </span>
              <textarea
                className="input"
                rows={3}
                value={step}
                aria-label={`Step ${i + 1}`}
                onChange={(e) => set("steps", r.steps.map((s, j) => (j === i ? e.target.value : s)))}
              />
              <button
                type="button"
                className="px-1 text-lg text-muted hover:text-danger"
                onClick={() => set("steps", r.steps.filter((_, j) => j !== i))}
                aria-label={`Remove step ${i + 1}`}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn-ghost mt-2"
          onClick={() => set("steps", [...r.steps, ""])}
        >
          Add step
        </button>
      </section>

      <section className="space-y-3">
        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="input"
            rows={3}
            value={r.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sourceLabel">
              Source
            </label>
            <input
              id="sourceLabel"
              className="input"
              value={r.sourceLabel}
              placeholder="e.g. Jamie's 30 Minute Meals, p. 84"
              onChange={(e) => set("sourceLabel", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="sourceUrl">
              Link
            </label>
            <input
              id="sourceUrl"
              className="input"
              type="url"
              value={r.sourceUrl ?? ""}
              onChange={(e) => set("sourceUrl", e.target.value || null)}
            />
          </div>
        </div>
      </section>

      {recipeId && (
        <button type="button" className="text-sm text-danger underline" onClick={remove}>
          Delete this recipe
        </button>
      )}

      {duplicates && (
        <div className="rounded-[20px] bg-lemon p-4 text-lemon-ink">
          <p className="font-semibold">You might already have this one:</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/recipes/${d.id}`} className="underline" target="_blank">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary" onClick={() => save(true)} disabled={pending}>
              Save anyway
            </button>
            <button type="button" className="btn-ghost" onClick={() => setDuplicates(null)}>
              Keep editing
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-[76px] z-10 bg-bg/95 px-4 py-3 backdrop-blur sm:bottom-0"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {error && <p className="flex-1 text-sm text-danger">{error}</p>}
          <div className="ml-auto flex gap-2">
            {onBack ? (
              <button type="button" className="btn-ghost" onClick={onBack}>
                Back
              </button>
            ) : (
              <Link href={recipeId ? `/recipes/${recipeId}` : "/recipes"} className="btn-ghost">
                Cancel
              </Link>
            )}
            <button type="submit" className="btn-primary" disabled={pending || !r.servings}>
              {pending ? "Saving…" : "Save recipe"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
