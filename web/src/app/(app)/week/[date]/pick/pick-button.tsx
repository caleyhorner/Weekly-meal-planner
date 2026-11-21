"use client";

import { useFormStatus } from "react-dom";

/** The recipe row in the picker; shows "Adding…" the moment it's tapped. */
export function PickButton({ highlighted, children }: { highlighted: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`card flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2 ${
        highlighted ? "ring-2 ring-ink" : ""
      } ${pending ? "bg-lemon text-lemon-ink" : ""}`}
    >
      {children}
      {pending && <span className="shrink-0 font-bold">Adding…</span>}
    </button>
  );
}
