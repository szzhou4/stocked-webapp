import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizeIngredients } from "@/lib/claude/extract";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { unitsCompatible, convertUnit } from "@/lib/units";

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

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
  const toInsert: typeof recipe.recipe_ingredients = [];

  for (const ing of recipe.recipe_ingredients) {
    // Skip basic pantry staples
    if (isBasicIngredient(ing.name, skipIngredients)) continue;

    // Skip if pantry has it and it's well-stocked
    const pantryMatch = pantryItems?.find((p) => namesMatch(ing.name, p.name));
    if (pantryMatch && pantryMatch.quantity > pantryMatch.min_quantity) continue;

    // Check if already in shopping list — match by name AND compatible units
    const existing = existingItems?.find(
      (s) => namesMatch(ing.name, s.name) && unitsCompatible(ing.unit, s.unit)
    );

    if (existing) {
      toMerge.push({
        existingId: existing.id,
        addQty: ing.quantity ?? 0,
        fromUnit: ing.unit ?? null,
        toUnit: existing.unit ?? null,
      });
    } else {
      toInsert.push(ing);
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

      // Round to 3 decimal places (matches DB numeric(10,3))
      const newQty = qtyToAdd > 0
        ? Math.round(((existing.quantity ?? 0) + qtyToAdd) * 1000) / 1000
        : existing.quantity;

      return supabase.from("shopping_items").update({ quantity: newQty }).eq("id", existingId);
    })
  );

  // Categorize and insert new items
  let inserted = 0;
  if (toInsert.length) {
    const categorized = await categorizeIngredients(toInsert, storeDescriptions);
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
