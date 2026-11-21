"use client";

import { useActionState, useState } from "react";
import type { PartyFormState } from "./actions";

/** Name, date and number of people for a dinner party. Used to start one and to edit it. */
export function PartyDetailsForm({
  action,
  initial,
  submitLabel,
  onCancel,
}: {
  action: (prev: PartyFormState, formData: FormData) => Promise<PartyFormState>;
  initial: { name: string; date: string | null; guests: number };
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [guests, setGuests] = useState(initial.guests);

  return (
    <form action={formAction} className="card space-y-4 p-4">
      <div>
        <label className="label" htmlFor="party-name">
          Name
        </label>
        <input
          id="party-name"
          name="name"
          className="input"
          defaultValue={initial.name}
          placeholder="e.g. Sam's 40th"
          required
          maxLength={120}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="party-date">
            Date <span className="font-normal text-muted">(if you know it)</span>
          </label>
          <input id="party-date" name="date" type="date" className="input" defaultValue={initial.date ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="party-guests">
            People eating <span className="font-normal text-muted">(you too)</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn bg-surface-2 text-ink"
              aria-label="One fewer person"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
            >
              −
            </button>
            <input
              id="party-guests"
              name="guests"
              className="input text-center text-xl font-bold"
              inputMode="numeric"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
            <button
              type="button"
              className="btn bg-surface-2 text-ink"
              aria-label="One more person"
              onClick={() => setGuests((g) => Math.min(40, g + 1))}
            >
              +
            </button>
          </div>
        </div>
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn bg-surface-2 text-ink" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
