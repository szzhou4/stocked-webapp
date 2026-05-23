/**
 * GET /api/admin/ingredient-gaps?token=<ADMIN_TOKEN>
 *
 * Scans recipe_ingredients and pantry_items across ALL users (via service-role
 * key, bypassing RLS) and reports ingredient names whose unit families conflict
 * between recipes and pantry but have no density entry in ingredientDensities.ts.
 *
 * Use this periodically to discover what to add to the density table.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ADMIN_TOKEN   (any secret string you choose)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUnitFamily, normalizeUnit } from "@/lib/units";
import { lookupDensity } from "@/lib/ingredientDensities";

type NameUnitRow = { name: string; unit: string | null; freq: number };

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = request.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing SUPABASE env vars" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Fetch all (name, unit) pairs from both tables ─────────────────────────
  const [{ data: recipeRows }, { data: pantryRows }] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .select("name, unit")
      .not("name", "is", null),
    supabase
      .from("pantry_items")
      .select("name, unit")
      .not("name", "is", null),
  ]);

  if (!recipeRows || !pantryRows) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  // ── Aggregate: name → set of unit families seen in recipes ────────────────
  const recipeIndex = buildIndex(recipeRows as NameUnitRow[]);
  const pantryIndex = buildIndex(pantryRows as NameUnitRow[]);

  // ── Find names that appear in both with cross-family unit mismatches ───────
  type GapEntry = {
    ingredient: string;
    recipeUnits: string[];
    pantryUnits: string[];
    recipeFamilies: string[];
    pantryFamilies: string[];
    hasDensityEntry: boolean;
    densityCapabilities: string[];
    frequency: number;
  };

  const gaps: GapEntry[] = [];

  for (const [name, rUnits] of recipeIndex.entries()) {
    // Find pantry entries whose name fuzzy-matches this recipe ingredient name
    const pUnits = findPantryUnits(name, pantryIndex);
    if (!pUnits || pUnits.size === 0) continue;

    const rFamilies = new Set([...rUnits.keys()].map(u => getUnitFamily(u)));
    const pFamilies = new Set([...pUnits.keys()].map(u => getUnitFamily(u)));

    // Only flag when there's a cross-family conflict
    const hasCrossFamily = [...rFamilies].some(rf => [...pFamilies].some(pf => pf !== rf && pf !== "other" && rf !== "other"));
    if (!hasCrossFamily) continue;

    const density = lookupDensity(name);
    const caps: string[] = [];
    if (density) {
      if (density.gPerCup)   caps.push("volume↔weight");
      if (density.gPerUnit)  caps.push("count↔weight");
      if (density.mlPerUnit) caps.push("count↔volume");
    }

    const totalFreq = [...rUnits.values()].reduce((a, b) => a + b, 0)
      + [...pUnits.values()].reduce((a, b) => a + b, 0);

    gaps.push({
      ingredient: name,
      recipeUnits: [...rUnits.keys()],
      pantryUnits: [...pUnits.keys()],
      recipeFamilies: [...rFamilies],
      pantryFamilies: [...pFamilies],
      hasDensityEntry: !!density,
      densityCapabilities: caps,
      frequency: totalFreq,
    });
  }

  // Sort: ungapped entries first, then by frequency desc
  gaps.sort((a, b) => {
    if (!a.hasDensityEntry && b.hasDensityEntry) return -1;
    if (a.hasDensityEntry && !b.hasDensityEntry) return 1;
    return b.frequency - a.frequency;
  });

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalConflicts = gaps.length;
  const uncovered = gaps.filter(g => !g.hasDensityEntry).length;
  const partiallyCovered = gaps.filter(g => g.hasDensityEntry && g.densityCapabilities.length < 2).length;

  return NextResponse.json({
    summary: {
      totalConflicts,
      uncoveredByDensityTable: uncovered,
      partiallyCovered,
      fullyHandled: totalConflicts - uncovered - partiallyCovered,
    },
    gaps,
    _instructions: [
      "Add missing entries to lib/ingredientDensities.ts",
      "gPerCup covers volume↔weight, gPerUnit covers count↔weight, mlPerUnit covers count↔volume",
      "Re-run this endpoint after deploying to verify coverage improved",
    ],
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a map of canonical-name → Map<normalised-unit, frequency> */
function buildIndex(rows: Array<{ name: string; unit: string | null }>): Map<string, Map<string, number>> {
  const idx = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const name = row.name.toLowerCase().trim();
    const unit = (normalizeUnit(row.unit) ?? row.unit ?? "").toLowerCase().trim();
    if (!name) continue;
    if (!idx.has(name)) idx.set(name, new Map());
    const unitMap = idx.get(name)!;
    unitMap.set(unit, (unitMap.get(unit) ?? 0) + 1);
  }
  return idx;
}

/**
 * Given a recipe ingredient name, find all pantry unit counts for
 * fuzzy-matching pantry entries (substring match, both directions).
 */
function findPantryUnits(
  recipeName: string,
  pantryIndex: Map<string, Map<string, number>>,
): Map<string, number> | null {
  const merged = new Map<string, number>();
  for (const [pantryName, unitMap] of pantryIndex.entries()) {
    if (
      pantryName.includes(recipeName) ||
      recipeName.includes(pantryName)
    ) {
      for (const [unit, freq] of unitMap.entries()) {
        merged.set(unit, (merged.get(unit) ?? 0) + freq);
      }
    }
  }
  return merged.size > 0 ? merged : null;
}
