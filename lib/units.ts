export type UnitFamily = "volume" | "weight" | "count" | "other";

/**
 * Maps common free-text unit variants to canonical short forms.
 * Call this on any unit string coming from AI extraction or user input
 * before storing or comparing.
 */
const UNIT_ALIASES: Record<string, string> = {
  // Volume
  tablespoon: "tbsp", tablespoons: "tbsp",
  teaspoon: "tsp",   teaspoons: "tsp",
  cup: "cups",
  milliliter: "ml",  milliliters: "ml", millilitre: "ml", millilitres: "ml",
  liter: "L",        liters: "L",       litre: "L",       litres: "L",
  // Fluid ounces (volume) — distinct from dry oz (weight)
  "fl oz": "fl oz",
  "fluid oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  "fl. oz.": "fl oz",
  "fl. oz": "fl oz",
  "fl oz.": "fl oz",
  // Weight — "oz" / "ounce" always means dry weight ounces
  ounce: "oz",  ounces: "oz",
  pound: "lbs", pounds: "lbs",
  gram: "g",    grams: "g",
  kilogram: "kg", kilograms: "kg",
  // Count — normalise plurals/singulars to the plural canonical form
  units: "unit",
  clove: "cloves",
  slice: "slices",
  piece: "pieces",
  loaf: "loaves",
  can: "cans",
  bag: "bags",
  bunch: "bunches",
};

export function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const trimmed = unit.trim();
  if (!trimmed) return null;
  return UNIT_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

// Conversion factors to canonical units (all keys lowercase)
// Volume → ml
const TO_ML: Record<string, number> = {
  tsp: 5,         // ~4.93, rounded for cooking
  tbsp: 15,       // ~14.79, rounded
  cup: 240,       // ~236.6, rounded
  cups: 240,
  "fl oz": 29.574, // 1 fluid ounce = 29.5735 ml
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
  const u = (normalizeUnit(unit) ?? unit).toLowerCase().trim();
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
  const from = (normalizeUnit(fromUnit) ?? fromUnit).toLowerCase().trim();
  const to = (normalizeUnit(toUnit) ?? toUnit).toLowerCase().trim();
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
  const aNorm = normalizeUnit(a);
  const bNorm = normalizeUnit(b);
  const aEmpty = !aNorm;
  const bEmpty = !bNorm;
  if (aEmpty && bEmpty) return true;
  if (aEmpty || bEmpty) return false; // one has units, other doesn't

  const al = aNorm!.toLowerCase().trim();
  const bl = bNorm!.toLowerCase().trim();
  if (al === bl) return true;

  const fa = getUnitFamily(al);
  const fb = getUnitFamily(bl);

  // Volume ↔ volume or weight ↔ weight: can convert
  if (fa === "volume" && fb === "volume") return true;
  if (fa === "weight" && fb === "weight") return true;

  // Count and other units must match exactly (already checked above)
  return false;
}
