import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizeIngredients } from "@/lib/claude/extract";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { convertUnit } from "@/lib/units";

function isBasicIngredient(name: string, skipList: string[]): boolean {
  const lower = name.toLowerCase().trim();
  return skipList.some(
    (skip) => lower === skip || lower.startsWith(skip + " ") || lower.endsWith(" " + skip)
  );
}

function namesMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  return al.includes(bl) || bl.includes(al);
}

/** Mirror of client-side computeMissing: returns true if pantry doesn't cover the scaled need */
function pantryCoversIngredient(
  ing: { quantity: number | null; unit: string | null },
  pantry: { quantity: number; unit: string | null; min_quantity: number },
  scale: number,
): boolean {
  if (pantry.quantity <= 0) return false;

  if (ing.quantity != null && ing.quantity > 0) {
    const needed = ing.quantity * scale;
    const ingUnit = (ing.unit ?? "").toLowerCase().trim();
    const pantryUnit = (pantry.unit ?? "").toLowerCase().trim();

    if (ingUnit === pantryUnit) {
      return pantry.quantity >= needed;
    } else if (ingUnit && pantryUnit) {
      const neededConverted = convertUnit(needed, ingUnit, pantryUnit);
      return neededConverted !== null && pantry.quantity >= neededConverted;
    } else if (!ingUnit && !pantryUnit) {
      return pantry.quantity >= needed;
    }
    // Mixed unit presence → fall back to existence + min_quantity check
    return pantry.quantity > pantry.min_quantity;
  }

  // No quantity on ingredient — existence check
  return pantry.quantity > pantry.min_quantity;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const force: boolean = body?.force === true;
  const requestedServings: number | null = body?.servings ?? null;

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  // Compute scale based on requested vs. recipe servings
  const scale =
    requestedServings && recipe.servings > 0
      ? requestedServings / recipe.servings
      : 1;

  // Fetch pantry, existing unchecked shopping items, and user settings in parallel
  const [{ data: pantryItems }, { data: existingItems }, { data: settingsRow }] = await Promise.all([
    supabase.from("pantry_items").select("*").eq("user_id", user.id),
    supabase.from("shopping_items").select("*").eq("user_id", user.id).eq("checked", false),
    supabase.from("user_settings").select("settings").eq("user_id", user.id).single(),
  ]);

  const skipIngredients: string[] = settingsRow?.settings?.skipIngredients ?? DEFAULT_SETTINGS.skipIngredients;
  const storeDescriptions = settingsRow?.settings?.stores ?? DEFAULT_SETTINGS.stores;

  type MergeEntry = { existingId: string; addQty: number; fromUnit: string | null; toUnit: string | null };
  const toMerge: MergeEntry[] = [];
  // Store scaled ingredients for insertion
  const toInsert: Array<typeof recipe.recipe_ingredients[number] & { _scaledQty: number | null }> = [];

  for (const ing of recipe.recipe_ingredients) {
    // Skip basic pantry staples
    if (isBasicIngredient(ing.name, skipIngredients)) continue;

    // Skip if pantry has enough for the scaled serving (unless user forced add-all)
    if (!force) {
      const pantryMatch = pantryItems?.find((p) => namesMatch(ing.name, p.name));
      if (pantryMatch && pantryCoversIngredient(ing, pantryMatch, scale)) continue;
    }

    // Scale the quantity for what we're actually adding
    const scaledQty = ing.quantity != null ? Math.round(ing.quantity * scale * 1000) / 1000 : null;

    // Check if already in shopping list — match by name
    const existing = existingItems?.find((s) => namesMatch(ing.name, s.name));

    if (existing) {
      toMerge.push({
        existingId: existing.id,
        addQty: scaledQty ?? 0,
        fromUnit: ing.unit ?? null,
        toUnit: existing.unit ?? null,
      });
    } else {
      toInsert.push({ ...ing, _scaledQty: scaledQty });
    }
  }

  if (!toMerge.length && !toInsert.length) {
    return NextResponse.json({ added: 0, message: "All ingredients are already in your shopping list or pantry" });
  }

  // Merge quantities into existing shopping items (with unit conversion)
  await Promise.all(
    toMerge.map(({ existingId, addQty, fromUnit, toUnit }) => {
      const existing = existingItems!.find((s) => s.id === existingId)!;

      let qtyToAdd = addQty;
      if (fromUnit && toUnit && fromUnit.toLowerCase() !== toUnit.toLowerCase()) {
        const converted = convertUnit(addQty, fromUnit, toUnit);
        if (converted !== null) qtyToAdd = converted;
      }

      const newQty = qtyToAdd > 0
        ? Math.round(((existing.quantity ?? 0) + qtyToAdd) * 1000) / 1000
        : existing.quantity;

      return supabase.from("shopping_items").update({ quantity: newQty }).eq("id", existingId);
    })
  );

  // Categorize and insert new items (using scaled quantities)
  let inserted = 0;
  if (toInsert.length) {
    const forCategorization = toInsert.map((ing) => ({ ...ing, quantity: ing._scaledQty }));
    const categorized = await categorizeIngredients(forCategorization, storeDescriptions);
    const rows = categorized.map((ing) => ({
      user_id: user.id,
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      store: ing.store,
      category: ing.category,
      recipe_id: id,
    }));
    const { error: insertError } = await supabase.from("shopping_items").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    inserted = rows.length;
  }

  return NextResponse.json({
    added: inserted,
    merged: toMerge.length,
    message: [
      inserted > 0 ? `Added ${inserted} new item${inserted !== 1 ? "s" : ""}` : "",
      toMerge.length > 0 ? `updated quantity on ${toMerge.length} existing item${toMerge.length !== 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", "),
  });
}
