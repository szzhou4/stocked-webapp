export const DEFAULT_SETTINGS = {
  stores: {
    costco: { name: "Costco", description: "Bulk/warehouse items: large quantities of meat, olive oil, nuts, frozen goods, paper products" },
    asian: { name: "Asian Market", description: "HMart/Ranch99: soy sauce, fish sauce, tofu, rice, noodles, Asian produce, kimchi, miso, sesame oil, coconut milk" },
    generic: { name: "Supermarket", description: "Standard supermarket: common produce, dairy, bread, pantry staples" },
    other: { name: "Other", description: "Specialty stores, alcohol, items that don't fit elsewhere" },
  },
  defaultStore: "generic" as string,
};

export type UserSettings = typeof DEFAULT_SETTINGS;
