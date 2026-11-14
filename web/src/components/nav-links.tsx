"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/recipes", label: "Recipes", match: (p: string) => p === "/recipes" || /^\/recipes\/(?!new)/.test(p) },
  { href: "/recipes/new", label: "Add recipe", match: (p: string) => p === "/recipes/new" },
];

export function NavLinks() {
  const pathname = usePathname();
  return LINKS.map((l) => {
    const active = l.match(pathname);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          active ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
        }`}
      >
        {l.label}
      </Link>
    );
  });
}
