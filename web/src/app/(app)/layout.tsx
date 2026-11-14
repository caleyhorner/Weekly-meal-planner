import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { TimezoneCookie } from "@/components/timezone-cookie";

// Every page here reads live household data.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-28 sm:pb-0">
      <TimezoneCookie />
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-extrabold">
            Dinners
          </Link>
          <nav className="hidden gap-2 sm:flex">
            <NavLinks />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-2 pb-6">{children}</main>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-2 bg-bg/95 px-4 pt-2 backdrop-blur sm:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <NavLinks />
      </nav>
    </div>
  );
}
