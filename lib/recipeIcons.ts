import type { LucideIcon } from "lucide-react";
import { Utensils, Soup, Flame, Leaf, Fish, Wheat, Cookie, Egg } from "lucide-react";

export type RecipeIconId =
  | "utensils"
  | "egg"
  | "soup"
  | "leaf"
  | "fish"
  | "wheat"
  | "flame"
  | "cookie";

export interface RecipeIconDef {
  id: RecipeIconId;
  label: string;
  Icon: LucideIcon;
  color: string; // Tailwind text color
  bg: string;    // Tailwind background color
}

export const RECIPE_ICONS: RecipeIconDef[] = [
  { id: "utensils", label: "General",       Icon: Utensils, color: "text-indigo-600", bg: "bg-indigo-50"  },
  { id: "egg",      label: "Breakfast",     Icon: Egg,      color: "text-yellow-500", bg: "bg-yellow-50"  },
  { id: "soup",     label: "Soup / Stew",   Icon: Soup,     color: "text-orange-500", bg: "bg-orange-50"  },
  { id: "leaf",     label: "Vegetarian",    Icon: Leaf,     color: "text-green-600",  bg: "bg-green-50"   },
  { id: "fish",     label: "Seafood",       Icon: Fish,     color: "text-blue-500",   bg: "bg-blue-50"    },
  { id: "wheat",    label: "Pasta / Grains",Icon: Wheat,    color: "text-amber-600",  bg: "bg-amber-50"   },
  { id: "flame",    label: "Grill / BBQ",   Icon: Flame,    color: "text-red-500",    bg: "bg-red-50"     },
  { id: "cookie",   label: "Dessert",       Icon: Cookie,   color: "text-pink-500",   bg: "bg-pink-50"    },
];

// Tag keyword rules — first match wins
const TAG_RULES: Array<{ keywords: string[]; icon: RecipeIconId }> = [
  { keywords: ["breakfast", "brunch", "morning"],                                       icon: "egg"      },
  { keywords: ["dessert", "baking", "cake", "cookie", "sweet", "pastry", "brownie"],   icon: "cookie"   },
  { keywords: ["seafood", "fish", "shrimp", "salmon", "sushi", "shellfish", "crab"],   icon: "fish"     },
  { keywords: ["vegetarian", "vegan", "salad", "mediterranean", "plant-based"],        icon: "leaf"     },
  { keywords: ["soup", "stew", "broth", "chili", "chowder"],                           icon: "soup"     },
  { keywords: ["pasta", "italian", "noodle", "risotto", "grain"],                      icon: "wheat"    },
  { keywords: ["grill", "bbq", "barbecue", "smoked", "roast"],                         icon: "flame"    },
];

/** Returns the icon definition for a stored id, falling back to "utensils". */
export function getRecipeIcon(id: string | null | undefined): RecipeIconDef {
  return RECIPE_ICONS.find((r) => r.id === id) ?? RECIPE_ICONS[0];
}

/** Auto-select the best icon id based on recipe tags. */
export function selectIconForTags(tags: string[]): RecipeIconId {
  const lower = tags.map((t) => t.toLowerCase());
  for (const { keywords, icon } of TAG_RULES) {
    if (lower.some((tag) => keywords.some((kw) => tag.includes(kw)))) {
      return icon;
    }
  }
  return "utensils";
}
