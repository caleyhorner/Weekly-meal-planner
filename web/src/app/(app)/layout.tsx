import Link from "next/link";
import { NavLinks } from "@/components/nav-links";

// Every page here reads live household data.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/recipes" className="font-serif text-2xl font-semibold">
            Dinners
          </Link>
          <nav className="hidden gap-1 sm:flex">
            <NavLinks />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur sm:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <NavLinks />
      </nav>
    </div>
  );
}
