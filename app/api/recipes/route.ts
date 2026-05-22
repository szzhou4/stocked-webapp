import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipes: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, source_url, image_url, servings, notes, ingredients } = body;

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({ user_id: user.id, name, source_url, image_url, servings: servings || 4, notes })
    .select()
    .single();

  if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 });

  if (ingredients?.length) {
    const rows = ingredients.map((ing: { name: string; quantity?: number; unit?: string; notes?: string }, i: number) => ({
      recipe_id: recipe.id,
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      notes: ing.notes ?? null,
      sort_order: i,
    }));
    const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows);
    if (ingError) return NextResponse.json({ error: ingError.message }, { status: 500 });
  }

  return NextResponse.json({ recipe }, { status: 201 });
}
