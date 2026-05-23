export type UnitFamily = "volume" | "weight" | "count" | "other";

// Conversion factors to canonical units (all keys lowercase)
// Volume → ml
const TO_ML: Record<string, number> = {
  tsp: 5,        // ~4.93, rounded for cooking
  tbsp: 15,      // ~14.79, rounded
  cup: 240,      // ~236.6, rounded
  cups: 240,
  ml: 1,
  l: 1000,
};

// Weight → g
const TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.35,
  lb: 453.59,
  lbs: 453.59,
};

const COUNT_UNITS = new Set([
  "cloves", "clove", "slices", "slice", "pieces", "piece",
  "loaves", "loaf", "cans", "can", "bags", "bag",
  "bunches", "bunch", "unit", "units",
]);

export function getUnitFamily(unit: string | null | undefined): UnitFamily {
  if (!unit) return "other";
  const u = unit.toLowerCase().trim();
  if (u in TO_ML) return "volume";
  if (u in TO_G) return "weight";
  if (COUNT_UNITS.has(u)) return "count";
  return "other";
}

/**
 * Convert qty from one unit to another.
 * Returns null if the units are in different families or unknown.
 * Same-unit input returns qty unchanged.
 */
export function convertUnit(
  qty: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  if (!fromUnit || !toUnit) return null;
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();
  if (from === to) return qty;

  const fromFamily = getUnitFamily(from);
  const toFamily = getUnitFamily(to);
  if (fromFamily !== toFamily || fromFamily === "other" || fromFamily === "count") return null;

  if (fromFamily === "volume") return (qty * TO_ML[from]) / TO_ML[to];
  if (fromFamily === "weight") return (qty * TO_G[from]) / TO_G[to];
  return null;
}

/**
 * Returns true if two quantities can be meaningfully summed:
 * - both null/unitless → compatible (add directly)
 * - one null, one with unit → NOT compatible (ambiguous)
 * - same unit → compatible
 * - both volume OR both weight → compatible (can convert)
 * - count units must be identical (cloves ≠ pieces)
 * - different families → NOT compatible
 */
export function unitsCompatible(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const aEmpty = !a;
  const bEmpty = !b;
  if (aEmpty && bEmpty) return true;
  if (aEmpty || bEmpty) return false; // one has units, other doesn't

  const al = a!.toLowerCase().trim();
  const bl = b!.toLowerCase().trim();
  if (al === bl) return true;

  const fa = getUnitFamily(al);
  const fb = getUnitFamily(bl);

  // Volume ↔ volume or weight ↔ weight: can convert
  if (fa === "volume" && fb === "volume") return true;
  if (fa === "weight" && fb === "weight") return true;

  // Count and other units must match exactly (already checked above)
  return false;
}
