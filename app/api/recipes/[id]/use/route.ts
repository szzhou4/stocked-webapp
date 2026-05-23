import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scaleQuantity } from "@/lib/utils";
import { unitsCompatible, convertUnit } from "@/lib/units";

function namesMatch(a: string, b: string): boolean {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  return al.includes(bl) || bl.includes(al);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { servings_made } = await request.json();

  // Fetch recipe with ingredients
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (recipeError || !recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const scale = servings_made / recipe.servings;

  // Log the use
  await supabase.from("recipe_uses").insert({
    user_id: user.id,
    recipe_id: id,
    servings_made,
    original_servings: recipe.servings,
  });

  // Fetch all pantry items for this user
  const { data: pantryItems } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", user.id);

  const lowItems: string[] = [];
  const depleted: string[] = [];
  const skipped: string[] = []; // incompatible unit families

  for (const ing of recipe.recipe_ingredients) {
    const scaledQty = scaleQuantity(ing.quantity, scale);
    if (scaledQty === null) continue;

    // Fuzzy match pantry item by name
    const match = pantryItems?.find((p) => namesMatch(ing.name, p.name));
    if (!match) continue;

    // Check unit compatibility — skip if different families (e.g. tbsp vs g)
    if (!unitsCompatible(ing.unit, match.unit)) {
      skipped.push(ing.name);
      continue;
    }

    // Convert ingredient qty to pantry unit if needed (same family, different unit)
    let qtyToSubtract = scaledQty;
    if (ing.unit && match.unit && ing.unit.toLowerCase() !== match.unit.toLowerCase()) {
      const converted = convertUnit(scaledQty, ing.unit, match.unit);
      if (converted === null) {
        // Shouldn't happen after unitsCompatible check, but guard anyway
        skipped.push(ing.name);
        continue;
      }
      qtyToSubtract = converted;
    }

    // Round to 3 decimal places (matches DB numeric(10,3))
    const newQty = Math.max(0, Math.round((match.quantity - qtyToSubtract) * 1000) / 1000);

    await supabase
      .from("pantry_items")
      .update({ quantity: newQty })
      .eq("id", match.id);

    depleted.push(ing.name);

    if (newQty <= (match.min_quantity ?? 0)) {
      lowItems.push(match.id);
    }
  }

  // Auto-add low items to shopping list (avoid duplicates)
  for (const pantryItemId of lowItems) {
    const item = pantryItems?.find((p) => p.id === pantryItemId);
    if (!item) continue;

    const { data: existing } = await supabase
      .from("shopping_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("pantry_item_id", pantryItemId)
      .eq("checked", false)
      .maybeSingle();

    if (!existing) {
      await supabase.from("shopping_items").insert({
        user_id: user.id,
        name: item.name,
        quantity: item.min_quantity || null,
        unit: item.unit,
        store: item.store,
        category: item.category,
        pantry_item_id: pantryItemId,
      });
    }
  }

  return NextResponse.json({
    success: true,
    depleted_count: depleted.length,
    low_items_count: lowItems.length,
    skipped_count: skipped.length,
    skipped_names: skipped,
  });
}
