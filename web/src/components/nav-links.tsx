"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Week", match: (p: string) => p === "/" || p.startsWith("/week") },
  {
    href: "/recipes",
    label: "Recipes",
    match: (p: string) => p === "/recipes" || /^\/recipes\/(?!new)/.test(p),
  },
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
        className={`flex min-h-12 items-center justify-center rounded-2xl px-2 text-base font-bold whitespace-nowrap transition-colors sm:px-5 ${
          active ? "bg-ink text-bg" : "bg-surface text-ink hover:bg-surface-2"
        }`}
      >
        {l.label}
      </Link>
    );
  });
}
