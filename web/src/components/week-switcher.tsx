import Link from "next/link";
import { addDays, weekRangeLabel } from "@/lib/week";

export function weekHeading(start: string, thisWeek: string): string {
  if (start === thisWeek) return "This week";
  if (start === addDays(thisWeek, 7)) return "Next week";
  if (start === addDays(thisWeek, 14)) return "Week after next";
  if (start === addDays(thisWeek, -7)) return "Last week";
  return "Week of";
}

function weekHref(basePath: string, start: string, thisWeek: string) {
  return start === thisWeek ? basePath : `${basePath}?week=${start}`;
}

const Arrow = ({ dir }: { dir: "left" | "right" }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
  </svg>
);

/**
 * Title plus a This week / Next week / Week after switcher, shared by the Week and List
 * pages so planning (and shopping) ahead is one tap away. Arrows reach further weeks.
 */
export function WeekSwitcher({
  basePath,
  title,
  start,
  thisWeek,
}: {
  basePath: "/" | "/list";
  title?: string;
  start: string;
  thisWeek: string;
}) {
  const options = [0, 7, 14].map((offset) => {
    const s = addDays(thisWeek, offset);
    return { start: s, label: ["This week", "Next week", "Week after"][offset / 7], range: weekRangeLabel(s) };
  });
  const inSwitcher = options.some((o) => o.start === start);

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl leading-tight font-extrabold">{title ?? weekHeading(start, thisWeek)}</h1>
          <p className="text-[17px] text-muted">
            {title ? `${weekHeading(start, thisWeek)}, ` : ""}
            {weekRangeLabel(start)}
          </p>
        </div>
        <nav aria-label="Earlier or later weeks" className="flex gap-2">
          <Link href={weekHref(basePath, addDays(start, -7), thisWeek)} className="btn-ghost w-12 px-0" aria-label="Previous week">
            <Arrow dir="left" />
          </Link>
          <Link href={weekHref(basePath, addDays(start, 7), thisWeek)} className="btn-ghost w-12 px-0" aria-label="Following week">
            <Arrow dir="right" />
          </Link>
        </nav>
      </div>

      <nav aria-label="Choose a week" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
        {options.map((o) => {
          const active = o.start === start;
          return (
            <Link
              key={o.start}
              href={weekHref(basePath, o.start, thisWeek)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center rounded-xl px-1 text-center leading-tight ${
                active ? "bg-surface font-bold shadow-sm" : "font-medium"
              }`}
            >
              <span className="text-[15px]">{o.label}</span>
              <span className="text-xs text-muted">{o.range}</span>
            </Link>
          );
        })}
      </nav>
      {!inSwitcher && (
        <p className="mt-2 text-[15px]">
          <Link href={basePath} className="font-bold underline">
            Back to this week
          </Link>
        </p>
      )}
    </div>
  );
}
