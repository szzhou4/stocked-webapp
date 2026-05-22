import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { categorizeIngredients } from "@/lib/claude/extract";

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

  // Check pantry to skip well-stocked items
  const { data: pantryItems } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", user.id);

  const ingredientsToAdd = recipe.recipe_ingredients.filter((ing: { name: string }) => {
    const ingNameLower = ing.name.toLowerCase();
    const pantryMatch = pantryItems?.find(
      (p) =>
        p.name.toLowerCase().includes(ingNameLower) ||
        ingNameLower.includes(p.name.toLowerCase())
    );
    // Skip if pantry item exists and has sufficient stock
    return !pantryMatch || pantryMatch.quantity <= pantryMatch.min_quantity;
  });

  if (!ingredientsToAdd.length) {
    return NextResponse.json({ added: 0, message: "Pantry already has all ingredients" });
  }

  // Categorize ingredients
  const categorized = await categorizeIngredients(ingredientsToAdd);

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

  return NextResponse.json({ added: rows.length });
}
