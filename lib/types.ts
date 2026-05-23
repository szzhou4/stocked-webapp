// Store is now a flexible string — default keys: costco, asian, generic, other
export type Store = string;

export const STORE_LABELS: Record<string, string> = {
  costco: "Costco",
  asian: "Asian (HMart/Ranch99)",
  generic: "Generic (Supermarket)",
  other: "Other",
};

export const STORE_COLORS: Record<string, string> = {
  costco: "bg-blue-100 text-blue-800",
  asian: "bg-red-100 text-red-800",
  generic: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

export const DEFAULT_STORE_COLOR = "bg-purple-100 text-purple-800";

export function getStoreLabel(store: string, userStores?: Record<string, { name: string }>): string {
  return userStores?.[store]?.name ?? STORE_LABELS[store] ?? store;
}

export function getStoreColor(store: string): string {
  return STORE_COLORS[store] ?? DEFAULT_STORE_COLOR;
}

export const UNITS = [
  "cups", "tbsp", "tsp",
  "oz", "lbs", "g", "kg",
  "ml", "L",
  "cloves", "slices", "pieces", "loaves", "cans", "bags", "bunches",
  "unit",
] as const;

export type Unit = (typeof UNITS)[number] | string;

export const CATEGORIES = [
  "produce",
  "dairy",
  "meat/seafood",
  "grains/dry",
  "canned/jarred",
  "frozen",
  "condiments/sauces",
  "baking",
  "beverages",
  "snacks",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  source_url: string | null;
  image_url: string | null;
  servings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  sort_order: number;
};

export type PantryItem = {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string | null;
  min_quantity: number;
  category: string;
  store: Store;
  created_at: string;
  updated_at: string;
};

export type ShoppingItem = {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  store: Store;
  category: string;
  checked: boolean;
  purchased_quantity: number | null;
  purchased_unit: string | null;
  pantry_item_id: string | null;
  recipe_id: string | null;
  saved_for_later: boolean;
  created_at: string;
};

export type RecipeUse = {
  id: string;
  user_id: string;
  recipe_id: string;
  servings_made: number;
  original_servings: number;
  used_at: string;
};
