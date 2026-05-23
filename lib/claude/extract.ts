import Anthropic from "@anthropic-ai/sdk";
import { normalizeUnit, unitsCompatible, convertUnit } from "@/lib/units";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Try to pull recipe ingredients from JSON-LD structured data in the page HTML.
 * Returns an array of raw ingredient strings (e.g. "1 lb flank steak") or null
 * if no Recipe schema is found.
 */
function extractRecipeJsonLd(html: string): string[] | null {
  const scriptRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRe)) {
    try {
      const json = JSON.parse(match[1]) as Record<string, unknown>;
      // Collect all Recipe-typed objects (may be nested in @graph)
      const candidates: Record<string, unknown>[] = [];
      if (Array.isArray(json["@graph"])) {
        for (const node of json["@graph"] as Record<string, unknown>[]) {
          const t = node["@type"];
          if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) {
            candidates.push(node);
          }
        }
      }
      const rootType = json["@type"];
      if (rootType === "Recipe" || (Array.isArray(rootType) && rootType.includes("Recipe"))) {
        candidates.push(json);
      }
      for (const recipe of candidates) {
        const ings = recipe["recipeIngredient"];
        if (Array.isArray(ings) && ings.length > 0) {
          return (ings as unknown[]).map(String).filter((s) => s.trim());
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Merge duplicate ingredients (same name, case-insensitive) that appear in
 * multiple recipe sections. Compatible units are summed; individual amounts
 * are recorded in the notes field.
 */
function deduplicateIngredients(ingredients: ExtractedIngredient[]): ExtractedIngredient[] {
  const indexByName = new Map<string, number>(); // normalized name → index in result
  const result: ExtractedIngredient[] = [];

  for (const ing of ingredients) {
    const key = ing.name.toLowerCase().trim();
    const existingIdx = indexByName.get(key);

    if (existingIdx === undefined) {
      indexByName.set(key, result.length);
      result.push({ ...ing });
      continue;
    }

    const existing = result[existingIdx];

    // Can't merge if either lacks a quantity
    if (existing.quantity === null || ing.quantity === null) continue;
    // Can't merge if units are incompatible
    if (!unitsCompatible(existing.unit, ing.unit)) continue;

    // Convert ing quantity to existing unit if needed
    let addQty = ing.quantity;
    if (ing.unit && existing.unit && ing.unit.toLowerCase() !== existing.unit.toLowerCase()) {
      const converted = convertUnit(ing.quantity, ing.unit, existing.unit);
      if (converted === null) continue;
      addQty = converted;
    }

    const totalQty = Math.round((existing.quantity + addQty) * 1000) / 1000;

    // Build a note that shows the breakdown (e.g. "1 tbsp (marinade) · 2 tbsp (sauce)")
    const fmtExisting = `${existing.quantity} ${existing.unit ?? ""}`.trim() +
      (existing.notes ? ` (${existing.notes})` : "");
    const fmtNew = `${ing.quantity} ${ing.unit ?? ""}`.trim() +
      (ing.notes ? ` (${ing.notes})` : "");
    const mergedNotes = `${fmtExisting} · ${fmtNew}`;

    result[existingIdx] = {
      ...existing,
      quantity: totalQty,
      notes: mergedNotes,
    };
  }

  return result;
}

const SKIP_INGREDIENTS = [
  "water", "salt", "pepper", "black pepper", "white pepper", "kosher salt",
  "sea salt", "table salt", "fine salt", "coarse salt", "flaky salt",
  "salt and pepper", "salt & pepper", "ground pepper", "freshly ground pepper",
  "to taste", "ice", "ice water", "cold water", "boiling water",
];

function filterBasicIngredients(
  ingredients: ExtractedIngredient[],
  skipList?: string[]
): ExtractedIngredient[] {
  const list = skipList ?? SKIP_INGREDIENTS;
  return ingredients.filter((ing) => {
    const lower = ing.name.toLowerCase().trim();
    return !list.some((skip) => lower === skip || lower.startsWith(skip + " ") || lower.endsWith(" " + skip));
  });
}

export type ExtractedIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
};

export type CategorizedIngredient = ExtractedIngredient & {
  store: "costco" | "asian" | "generic" | "other";
  category: string;
};

const DEFAULT_STORES = `costco (bulk/warehouse items like large quantities of meat, olive oil, nuts, frozen goods, paper products), asian (HMart/Ranch99 - Asian groceries, soy sauce, fish sauce, tofu, rice, noodles, Asian produce, kimchi, miso, sesame oil, coconut milk, etc.), generic (standard supermarket items like common produce, dairy, bread, standard pantry staples), other (specialty items, alcohol, items that don't fit elsewhere)`;

function buildStoreString(storeDescriptions?: Record<string, { name: string; description: string }>): string {
  if (!storeDescriptions) return DEFAULT_STORES;
  return Object.entries(storeDescriptions)
    .map(([key, { name, description }]) => `${key} (${name}: ${description})`)
    .join(", ");
}

const CATEGORIES = `produce, dairy, meat/seafood, grains/dry, canned/jarred, frozen, condiments/sauces, baking, beverages, snacks, other`;

const EXTRACT_PROMPT = `Extract ALL ingredients from this recipe, including every section (marinade, sauce, batter, topping, etc.). Return a JSON array of objects with these fields:
- name: string (ingredient name only, no quantities)
- quantity: number or null
- unit: string or null — use ONLY these short forms: "cups", "tbsp", "tsp", "fl oz" (fluid/liquid ounces), "oz" (dry weight ounces only), "lbs", "g", "kg", "ml", "L", "cloves", "cans", "slices", "pieces", or null if no unit. IMPORTANT: use "fl oz" for liquid volume (e.g. soy sauce, broth), "oz" only for solid weight.
- notes: string or null — include prep notes ("chopped", "room temperature"), packaging context ("1 can (14 oz)", "1 block"), AND which section it belongs to if there are multiple sections (e.g. "for marinade", "for sauce")

Omit water, salt, pepper, and their common variations. Only return the JSON array, no other text.`;

export async function extractIngredientsFromText(text: string, skipIngredients?: string[]): Promise<ExtractedIngredient[]> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `${EXTRACT_PROMPT}\n\nRecipe text:\n${text}`,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in response");
  const parsed: ExtractedIngredient[] = JSON.parse(jsonMatch[0]);
  const filtered = filterBasicIngredients(
    parsed.map((i) => ({ ...i, unit: normalizeUnit(i.unit) })),
    skipIngredients,
  );
  return deduplicateIngredients(filtered);
}

export async function extractIngredientsFromUrl(url: string, skipIngredients?: string[]): Promise<ExtractedIngredient[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Stocked/1.0)" },
  });
  const html = await res.text();

  // Prefer structured JSON-LD data — it already has clean ingredient strings
  // and won't lose quantities due to HTML formatting
  const jsonLdIngredients = extractRecipeJsonLd(html);
  if (jsonLdIngredients && jsonLdIngredients.length > 0) {
    return extractIngredientsFromText(jsonLdIngredients.join("\n"), skipIngredients);
  }

  // Fallback: strip tags and pass plain text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 8000);

  return extractIngredientsFromText(text, skipIngredients);
}

export async function extractIngredientsFromImage(base64Image: string, mediaType: string, skipIngredients?: string[]): Promise<ExtractedIngredient[]> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64Image },
        },
        {
          type: "text",
          text: EXTRACT_PROMPT,
        },
      ],
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in response");
  const parsed: ExtractedIngredient[] = JSON.parse(jsonMatch[0]);
  const filtered = filterBasicIngredients(
    parsed.map((i) => ({ ...i, unit: normalizeUnit(i.unit) })),
    skipIngredients,
  );
  return deduplicateIngredients(filtered);
}

export async function suggestTags(
  ingredients: ExtractedIngredient[],
  availableTags: string[],
): Promise<string[]> {
  if (!availableTags.length) return [];
  const ingredientList = ingredients.map((i) => i.name).join(", ");
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `Based on these recipe ingredients: ${ingredientList}\n\nSelect all relevant tags from this list: ${availableTags.join(", ")}\n\nReturn only a JSON array of matching tag strings. Only include tags that clearly apply (e.g. "Asian" if ingredients suggest an Asian dish, "Vegetarian" if no meat/fish). Return [] if none fit well. Only return the JSON array, no other text.`,
    }],
  });
  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const suggested: string[] = JSON.parse(jsonMatch[0]);
    return suggested.filter((t) => availableTags.includes(t));
  } catch {
    return [];
  }
}

export async function categorizeIngredients(
  ingredients: ExtractedIngredient[],
  storeDescriptions?: Record<string, { name: string; description: string }>
): Promise<CategorizedIngredient[]> {
  const list = ingredients.map((i) => i.name).join("\n");
  const STORES = buildStoreString(storeDescriptions);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `For each ingredient below, assign a store and category.

Stores: ${STORES}
Categories: ${CATEGORIES}

Return a JSON array in the same order as the input. Each object: { "store": one of costco/asian/generic/other, "category": one of the categories above }.

Ingredients:
${list}

Only return the JSON array.`,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in response");
  const categorized: { store: string; category: string }[] = JSON.parse(jsonMatch[0]);

  return ingredients.map((ing, i) => ({
    ...ing,
    store: (categorized[i]?.store || "generic") as CategorizedIngredient["store"],
    category: categorized[i]?.category || "other",
  }));
}
