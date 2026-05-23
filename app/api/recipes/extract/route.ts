import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractIngredientsFromUrl,
  extractIngredientsFromText,
  extractIngredientsFromImage,
  categorizeIngredients,
  suggestTags,
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
  const skipIngredients: string[] = settingsRow?.settings?.skipIngredients ?? DEFAULT_SETTINGS.skipIngredients;
  const recipeTags: string[] = settingsRow?.settings?.recipeTags ?? DEFAULT_SETTINGS.recipeTags;

  try {
    let ingredients;
    if (url) {
      ingredients = await extractIngredientsFromUrl(url, skipIngredients);
    } else if (imageBase64) {
      ingredients = await extractIngredientsFromImage(imageBase64, imageMediaType || "image/jpeg", skipIngredients);
    } else if (text) {
      ingredients = await extractIngredientsFromText(text, skipIngredients);
    } else {
      return NextResponse.json({ error: "Provide url, text, or imageBase64" }, { status: 400 });
    }

    const [categorized, suggestedTags] = await Promise.all([
      categorizeIngredients(ingredients, storeDescriptions),
      suggestTags(ingredients, recipeTags),
    ]);
    return NextResponse.json({ ingredients: categorized, suggestedTags });
  } catch (err) {
    console.error("Extract error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
