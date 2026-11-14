// How much of each recipe to make for the household.
// Rule agreed with the family: only halve, keep, double or triple, and pick the smallest
// of those that feeds everyone. Leftovers are fine; awkward fractions aren't.

export const MULTIPLIERS = [0.5, 1, 2, 3] as const;

export function autoMultiplier(recipeServes: number, householdSize: number): number {
  for (const m of MULTIPLIERS) if (recipeServes * m >= householdSize) return m;
  // Tiny recipes (serves 1) for a big household: scale up whole.
  return Math.ceil(householdSize / recipeServes);
}

export function mealMultiplier(
  recipeServes: number,
  householdSize: number,
  chosen: number | null,
): number {
  return chosen ?? autoMultiplier(recipeServes, householdSize);
}

export function multiplierLabel(m: number): string {
  if (m === 0.5) return "halved";
  if (m === 1) return "as written";
  if (m === 2) return "doubled";
  if (m === 3) return "tripled";
  return `×${m}`;
}

/** Servings a meal makes, rounded for display (a halved "serves 5" makes 2½ → "2½"). */
export function servesLabel(n: number): string {
  return Number.isInteger(n) ? String(n) : `${Math.floor(n)}½`;
}
