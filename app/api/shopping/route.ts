import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("user_id", user.id)
    .order("store")
    .order("category")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("shopping_items")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();

  // If marking as checked with purchased quantity, update pantry
  if (updates.checked && updates.purchased_quantity !== undefined) {
    const { data: item } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (item?.pantry_item_id) {
      // Update existing pantry item
      const { data: pantryItem } = await supabase
        .from("pantry_items")
        .select("quantity")
        .eq("id", item.pantry_item_id)
        .single();

      if (pantryItem) {
        await supabase
          .from("pantry_items")
          .update({ quantity: pantryItem.quantity + updates.purchased_quantity })
          .eq("id", item.pantry_item_id);
      }
    } else if (item && updates.purchased_quantity > 0) {
      // Check if a same-named pantry item already exists (fuzzy match) before inserting
      const itemName = (updates.name || item.name) as string;
      const { data: existingPantry } = await supabase
        .from("pantry_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .ilike("name", itemName)
        .maybeSingle();

      if (existingPantry) {
        // Merge into existing item
        await supabase
          .from("pantry_items")
          .update({ quantity: existingPantry.quantity + updates.purchased_quantity })
          .eq("id", existingPantry.id);
      } else {
        // Create new pantry item — use substituted name if provided
        await supabase.from("pantry_items").insert({
          user_id: user.id,
          name: itemName,
          quantity: updates.purchased_quantity,
          unit: updates.purchased_unit || item.unit,
          category: item.category,
          store: item.store,
          min_quantity: 1,
        });
      }
    }
  }

  const { data, error } = await supabase
    .from("shopping_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
