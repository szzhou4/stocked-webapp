import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractIngredientsFromUrl,
  extractIngredientsFromText,
  extractIngredientsFromImage,
  categorizeIngredients,
} from "@/lib/claude/extract";
import { DEFAULT_SETTINGS } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { url, text, imageBase64, imageMediaType } = body;

  // Fetch user's store descriptions for categorization
  const { data: settingsRow } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .single();
  const storeDescriptions = settingsRow?.settings?.stores ?? DEFAULT_SETTINGS.stores;

  try {
    let ingredients;
    if (url) {
      ingredients = await extractIngredientsFromUrl(url);
    } else if (imageBase64) {
      ingredients = await extractIngredientsFromImage(imageBase64, imageMediaType || "image/jpeg");
    } else if (text) {
      ingredients = await extractIngredientsFromText(text);
    } else {
      return NextResponse.json({ error: "Provide url, text, or imageBase64" }, { status: 400 });
    }

    const categorized = await categorizeIngredients(ingredients, storeDescriptions);
    return NextResponse.json({ ingredients: categorized });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
