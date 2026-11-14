// Display helpers for amounts, times and recipe cards. Pure functions, safe on client and server.

const FRACTIONS: [number, string][] = [
  [0, ""],
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
  [1, ""],
];

/** 1.5 → "1½", 0.333 → "⅓", 2.97 → "3". Used for spoons, cups and counts. */
export function toFraction(n: number): string {
  let whole = Math.floor(n);
  const frac = n - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(frac - f[0]) < Math.abs(frac - best[0])) best = f;
  if (best[0] === 1) {
    whole += 1;
    best = FRACTIONS[0];
  }
  // Tiny but non-zero amounts (e.g. a scaled pinch) still show something.
  if (whole === 0 && best[1] === "") return n > 0 ? "⅛" : "0";
  return `${whole || ""}${best[1]}`;
}

const METRIC = new Set(["g", "kg", "ml", "l"]);

function roundMetric(n: number): number {
  if (n >= 100) return Math.round(n / 5) * 5;
  if (n >= 10) return Math.round(n);
  return Math.round(n * 10) / 10;
}

/** Formats an amount + unit, normalising g→kg and ml→l when large. */
export function formatQuantity(amount: number | null, unit: string | null): string {
  if (amount == null) return unit ?? "";
  if (unit && METRIC.has(unit)) {
    let a = amount;
    let u = unit;
    if (u === "g" && a >= 1000) [a, u] = [a / 1000, "kg"];
    if (u === "ml" && a >= 1000) [a, u] = [a / 1000, "l"];
    if (u === "kg" && a < 1) [a, u] = [a * 1000, "g"];
    if (u === "l" && a < 1) [a, u] = [a * 1000, "ml"];
    const shown = u === "kg" || u === "l" ? Math.round(a * 100) / 100 : roundMetric(a);
    return `${shown}${u === "l" ? " L" : u}`;
  }
  const n = toFraction(amount);
  if (!unit) return n;
  const plural = amount > 1 && !["tsp", "tbsp", "pinch"].includes(unit) ? `${unit}s` : unit;
  return `${n} ${plural}`;
}

export function formatMinutes(min: number | null): string | null {
  if (min == null || min <= 0) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

const CARD_COLOURS = [
  ["#c2562f", "#fbe7dc"],
  ["#2f7d6b", "#dcf1ea"],
  ["#7a5bb5", "#ebe3f7"],
  ["#b5862a", "#f8eccf"],
  ["#3f6fb0", "#dfe9f7"],
  ["#a8456b", "#f6dfe8"],
  ["#5d7f2f", "#e6f0d6"],
] as const;

/** Stable colour pair for recipes without a food photo. */
export function cardColours(title: string): { fg: string; bg: string } {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [fg, bg] = CARD_COLOURS[h % CARD_COLOURS.length];
  return { fg, bg };
}

export function relativeDays(isoDate: string | null, today = new Date()): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T00:00:00`);
  const days = Math.round((today.setHours(0, 0, 0, 0) - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
