import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data, error }, { data: pantryData }] = await Promise.all([
    supabase.from("recipes").select("*, recipe_ingredients(*)").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("pantry_items").select("name, quantity, min_quantity, unit").eq("user_id", user.id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ recipe: data, pantryItems: pantryData || [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { ingredients, ...recipeUpdates } = body;

  // Update recipe fields
  if (Object.keys(recipeUpdates).length > 0) {
    await supabase.from("recipes").update(recipeUpdates).eq("id", id).eq("user_id", user.id);
  }

  // Replace ingredient list if provided
  if (Array.isArray(ingredients)) {
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    if (ingredients.length > 0) {
      await supabase.from("recipe_ingredients").insert(
        ingredients.map((ing: Record<string, unknown>, i: number) => ({
          recipe_id: id,
          name: ing.name,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          notes: ing.notes ?? null,
          sort_order: i,
        }))
      );
    }
  }

  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipe: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
