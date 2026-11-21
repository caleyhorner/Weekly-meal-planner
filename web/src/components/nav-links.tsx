"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/", label: "Week", match: (p: string) => p === "/" || p.startsWith("/week") },
  { href: "/list", label: "List", match: (p: string) => p.startsWith("/list") },
  {
    href: "/recipes",
    label: "Recipes",
    match: (p: string) => p === "/recipes" || /^\/recipes\/(?!new)/.test(p),
  },
  { href: "/recipes/new", label: "Add", match: (p: string) => p === "/recipes/new" },
];

export function NavLinks() {
  const pathname = usePathname();
  // Moving between Week and List keeps you on the week you were looking at.
  const week = useSearchParams().get("week");
  const keepsWeek = (href: string) => (href === "/" || href === "/list") && week && /^\d{4}-\d{2}-\d{2}$/.test(week);
  return LINKS.map((l) => {
    const active = l.match(pathname);
    const href = keepsWeek(l.href) ? `${l.href}?week=${week}` : l.href;
    return (
      <Link
        key={l.href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-12 items-center justify-center rounded-2xl px-2 text-base font-bold whitespace-nowrap transition-colors sm:px-5 ${
          active ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-surface-2"
        }`}
      >
        {l.label}
      </Link>
    );
  });
}
