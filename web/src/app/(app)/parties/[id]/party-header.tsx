"use client";

import { useState, useTransition } from "react";
import { deletePartyAction, updatePartyAction, type PartyFormState } from "../actions";
import { PartyDetailsForm } from "../party-details-form";

export function PartyHeader({
  party,
  when,
}: {
  party: { id: string; name: string; date: string | null; guests: number };
  /** e.g. "Saturday 6 Dec", worked out on the server. */
  when: string;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();

  if (editing) {
    const save = async (prev: PartyFormState, formData: FormData) => {
      const res = await updatePartyAction(party.id, prev, formData);
      if (!res) setEditing(false);
      return res;
    };
    return (
      <div className="mt-2 space-y-3">
        <PartyDetailsForm action={save} initial={party} submitLabel="Save" onCancel={() => setEditing(false)} />
        <button
          type="button"
          className="text-sm text-danger underline"
          disabled={deleting}
          onClick={() => {
            if (confirm(`Delete “${party.name}”? Its dishes and shopping list go too. The recipes stay.`)) {
              startDelete(() => deletePartyAction(party.id));
            }
          }}
        >
          {deleting ? "Deleting…" : "Delete this party"}
        </button>
      </div>
    );
  }

  return (
    <header className="mt-1">
      <h1 className="text-3xl leading-tight font-extrabold">{party.name}</h1>
      <p className="mt-1 text-[17px] text-muted">
        {when}. For {party.guests} {party.guests === 1 ? "person" : "people"}.{" "}
        <button type="button" className="font-bold text-accent underline" onClick={() => setEditing(true)}>
          Change
        </button>
      </p>
    </header>
  );
}
