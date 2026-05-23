import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all unchecked, active (not saved-for-later) items
  const { data: items, error } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("checked", false)
    .eq("saved_for_later", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!items?.length) return NextResponse.json({ success: true, count: 0 });

  for (const item of items) {
    const qty: number | null = item.quantity ?? null;

    // Only update pantry when a quantity is set
    if (qty !== null && qty > 0) {
      if (item.pantry_item_id) {
        // Increment an existing linked pantry item
        const { data: existing } = await supabase
          .from("pantry_items")
          .select("quantity")
          .eq("id", item.pantry_item_id)
          .single();
        if (existing) {
          await supabase
            .from("pantry_items")
            .update({ quantity: existing.quantity + qty })
            .eq("id", item.pantry_item_id);
        }
      } else {
        // Check for an existing same-named pantry item (case-insensitive)
        const { data: existing } = await supabase
          .from("pantry_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .ilike("name", item.name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("pantry_items")
            .update({ quantity: existing.quantity + qty })
            .eq("id", existing.id);
        } else {
          await supabase.from("pantry_items").insert({
            user_id: user.id,
            name: item.name,
            quantity: qty,
            unit: item.unit ?? null,
            category: item.category,
            store: item.store,
            min_quantity: 0,
          });
        }
      }
    }

    // Mark the shopping item as purchased
    await supabase
      .from("shopping_items")
      .update({
        checked: true,
        purchased_quantity: qty,
        purchased_unit: item.unit ?? null,
      })
      .eq("id", item.id);
  }

  return NextResponse.json({ success: true, count: items.length });
}
