import Anthropic from "@anthropic-ai/sdk";
import { normalizeUnit } from "@/lib/units";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function extractIngredientsFromText(text: string, skipIngredients?: string[]): Promise<ExtractedIngredient[]> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Extract all ingredients from this recipe text. Return a JSON array of objects with fields: name (string), quantity (number or null), unit (string or null, e.g. "cups", "tbsp", "lbs", "g", or null if no unit), notes (string or null, e.g. "chopped", "room temperature"). Omit basic pantry staples that every kitchen has: water, salt, pepper, and their common variations (kosher salt, black pepper, etc.). Only return the JSON array, no other text.\n\nRecipe text:\n${text}`,
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in response");
  const parsed: ExtractedIngredient[] = JSON.parse(jsonMatch[0]);
  return filterBasicIngredients(
    parsed.map((i) => ({ ...i, unit: normalizeUnit(i.unit) })),
    skipIngredients,
  );
}

export async function extractIngredientsFromUrl(url: string, skipIngredients?: string[]): Promise<ExtractedIngredient[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Stocked/1.0)" },
  });
  const html = await res.text();
  // Strip scripts/styles, keep text
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
          text: `Extract all ingredients from this recipe image. Return a JSON array of objects with fields: name (string), quantity (number or null), unit (string or null), notes (string or null). Omit basic pantry staples: water, salt, pepper, and their variations. Only return the JSON array, no other text.`,
        },
      ],
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in response");
  const parsed: ExtractedIngredient[] = JSON.parse(jsonMatch[0]);
  return filterBasicIngredients(
    parsed.map((i) => ({ ...i, unit: normalizeUnit(i.unit) })),
    skipIngredients,
  );
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
