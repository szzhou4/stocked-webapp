import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizeIngredients } from "@/lib/claude/extract";

const BASIC_INGREDIENTS = [
  "water", "salt", "pepper", "black pepper", "white pepper", "kosher salt",
  "sea salt", "table salt", "fine salt", "coarse salt", "flaky salt",
  "salt and pepper", "salt & pepper", "ground pepper", "freshly ground pepper",
  "to taste", "ice", "ice water", "cold water", "boiling water",
];

function isBasicIngredient(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return BASIC_INGREDIENTS.some(
    (skip) => lower === skip || lower.startsWith(skip + " ") || lower.endsWith(" " + skip)
  );
}

function namesMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  return al.includes(bl) || bl.includes(al);
}

function unitsCompatible(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  return a.toLowerCase() === b.toLowerCase();
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

  // Fetch pantry and existing unchecked shopping items in parallel
  const [{ data: pantryItems }, { data: existingItems }] = await Promise.all([
    supabase.from("pantry_items").select("*").eq("user_id", user.id),
    supabase.from("shopping_items").select("*").eq("user_id", user.id).eq("checked", false),
  ]);

  const toMerge: { existingId: string; addQty: number }[] = [];
  const toInsert: typeof recipe.recipe_ingredients = [];

  for (const ing of recipe.recipe_ingredients) {
    // Skip basic pantry staples (water, salt, pepper, etc.)
    if (isBasicIngredient(ing.name)) continue;

    // Skip if pantry has it and it's well-stocked
    const pantryMatch = pantryItems?.find((p) => namesMatch(ing.name, p.name));
    if (pantryMatch && pantryMatch.quantity > pantryMatch.min_quantity) continue;

    // Check if already in shopping list
    const existing = existingItems?.find(
      (s) => namesMatch(ing.name, s.name) && unitsCompatible(ing.unit, s.unit)
    );
    if (existing) {
      toMerge.push({ existingId: existing.id, addQty: ing.quantity ?? 0 });
    } else {
      toInsert.push(ing);
    }
  }

  if (!toMerge.length && !toInsert.length) {
    return NextResponse.json({ added: 0, message: "All ingredients are already in your shopping list or pantry" });
  }

  // Merge quantities into existing shopping items
  await Promise.all(
    toMerge.map(({ existingId, addQty }) => {
      const existing = existingItems!.find((s) => s.id === existingId)!;
      const newQty = addQty > 0 ? (existing.quantity ?? 0) + addQty : existing.quantity;
      return supabase.from("shopping_items").update({ quantity: newQty }).eq("id", existingId);
    })
  );

  // Categorize and insert new items
  let inserted = 0;
  if (toInsert.length) {
    const categorized = await categorizeIngredients(toInsert);
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
