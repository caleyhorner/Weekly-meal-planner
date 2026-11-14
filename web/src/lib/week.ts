// Date helpers for the Saturday-to-Friday week. Dates are plain "YYYY-MM-DD" strings
// (no time zone), so all maths happens on UTC midnight.

export const WEEK_START_DAY = 6; // Saturday (0 = Sunday)

const DAY = 86_400_000;

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());
}

export function addDays(iso: string, n: number): string {
  return toIso(new Date(toDate(iso).getTime() + n * DAY));
}

/** The Saturday on or before the given date. */
export function weekStartFor(iso: string): string {
  const dow = toDate(iso).getUTCDay();
  return addDays(iso, -((dow - WEEK_START_DAY + 7) % 7));
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Today's date in the given IANA time zone (falls back to UTC). */
export function todayIn(timeZone: string | undefined): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "UTC" }).format(new Date());
  } catch {
    return toIso(new Date());
  }
}

export function dayName(iso: string): string {
  return toDate(iso).toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
}

export function shortDate(iso: string): string {
  return toDate(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** "15 – 21 Nov" or "29 Nov – 5 Dec". */
export function weekRangeLabel(start: string): string {
  const end = addDays(start, 6);
  const s = toDate(start);
  const e = toDate(end);
  const month = (d: Date) => d.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" });
  return s.getUTCMonth() === e.getUTCMonth()
    ? `${s.getUTCDate()} – ${e.getUTCDate()} ${month(e)}`
    : `${s.getUTCDate()} ${month(s)} – ${e.getUTCDate()} ${month(e)}`;
}
