/**
 * Returns the Saturday that starts the current meal-planning week.
 * If today is Saturday, returns today.
 */
export function getWeekStartDate(from: Date = new Date()): Date {
  const day = from.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 6 ? 0 : -(day + 1); // go back to last Saturday
  const sat = new Date(from);
  sat.setDate(from.getDate() + diff);
  sat.setHours(0, 0, 0, 0);
  return sat;
}

/**
 * Returns an ordered array of 7 ISO date strings for the week Sat–Fri.
 */
export function getWeekDates(weekStart: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(toISODate(d));
  }
  return dates;
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function formatDayName(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-AU', { weekday: 'long' });
}

export function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
