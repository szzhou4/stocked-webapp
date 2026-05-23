export type StoreEntry = { name: string; description: string };

export type UserSettings = {
  stores: Record<string, StoreEntry>;
  defaultStore: string;
  skipIngredients: string[];
};

export const DEFAULT_SKIP_INGREDIENTS = [
  "water", "salt", "pepper", "black pepper", "white pepper", "kosher salt",
  "sea salt", "table salt", "fine salt", "coarse salt", "flaky salt",
  "salt and pepper", "salt & pepper", "ground pepper", "freshly ground pepper",
  "to taste", "ice", "ice water", "cold water", "boiling water",
];

export const DEFAULT_SETTINGS: UserSettings = {
  stores: {
    costco: { name: "Costco", description: "Bulk/warehouse items: large quantities of meat, olive oil, nuts, frozen goods, paper products" },
    asian: { name: "Asian Market", description: "HMart/Ranch99: soy sauce, fish sauce, tofu, rice, noodles, Asian produce, kimchi, miso, sesame oil, coconut milk" },
    generic: { name: "Supermarket", description: "Standard supermarket: common produce, dairy, bread, pantry staples" },
    other: { name: "Other", description: "Specialty stores, alcohol, items that don't fit elsewhere" },
  },
  defaultStore: "generic",
  skipIngredients: DEFAULT_SKIP_INGREDIENTS,
};
