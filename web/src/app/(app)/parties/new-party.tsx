"use client";

import { useState } from "react";
import { createPartyAction } from "./actions";
import { PartyDetailsForm } from "./party-details-form";

export function NewParty({ startOpen }: { startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  if (!open) {
    return (
      <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
        Plan a dinner party
      </button>
    );
  }
  return (
    <PartyDetailsForm
      action={createPartyAction}
      initial={{ name: "", date: null, guests: 8 }}
      submitLabel="Start planning"
      onCancel={startOpen ? undefined : () => setOpen(false)}
    />
  );
}
