/**
 * Ingredient density and count-conversion table.
 *
 * gPerCup   — grams per 240 ml cup        (enables volume ↔ weight)
 * gPerUnit  — grams per one count item    (enables count  ↔ weight)
 * mlPerUnit — millilitres per count item  (enables count  ↔ volume)
 *
 * All values are culinary estimates (USDA / standard cookbook references).
 * Precision beyond ~5 % is unnecessary for "do I have enough?" checks.
 *
 * UPDATE PROTOCOL
 * ---------------
 * 1. Run GET /api/admin/ingredient-gaps (needs SUPABASE_SERVICE_ROLE_KEY +
 *    ADMIN_TOKEN env vars) to get a report of real-world unit-conflict pairs
 *    that have no density entry.
 * 2. Add missing entries here.
 * 3. Commit & deploy — changes take effect immediately (no DB migration needed).
 */

export type DensityEntry = {
  gPerCup?: number;
  gPerUnit?: number;
  mlPerUnit?: number;
  aliases: string[];
};

// Keys are lowercase canonical names.
const DENSITIES: Record<string, DensityEntry> = {

  // ── BAKING ────────────────────────────────────────────────────────────────
  "all-purpose flour":  { gPerCup: 125, aliases: ["flour", "ap flour", "plain flour", "white flour", "all purpose flour", "wheat flour"] },
  "bread flour":        { gPerCup: 120, aliases: ["strong flour"] },
  "whole wheat flour":  { gPerCup: 130, aliases: ["wholemeal flour", "whole grain flour", "whole-wheat flour", "wholewheat flour"] },
  "almond flour":       { gPerCup:  96, aliases: ["ground almonds", "almond meal"] },
  "rice flour":         { gPerCup: 158, aliases: ["white rice flour", "glutinous rice flour"] },
  "cake flour":         { gPerCup: 100, aliases: [] },
  "oat flour":          { gPerCup:  92, aliases: [] },
  "cornmeal":           { gPerCup: 156, aliases: ["polenta", "corn meal", "masa harina", "masa"] },
  "cornstarch":         { gPerCup: 128, aliases: ["corn starch", "corn flour", "maizena", "arrowroot"] },
  "cocoa powder":       { gPerCup:  85, aliases: ["unsweetened cocoa", "dutch cocoa", "cacao powder", "cocoa"] },
  "baking powder":      { gPerCup: 192, aliases: [] },
  "baking soda":        { gPerCup: 230, aliases: ["bicarbonate of soda", "bicarb", "sodium bicarbonate"] },
  "table salt":         { gPerCup: 288, aliases: ["salt", "kosher salt", "sea salt", "fine salt", "coarse salt"] },
  "active dry yeast":   { gPerCup: 150, aliases: ["yeast", "instant yeast", "dry yeast", "fast action yeast"] },
  "panko":              { gPerCup:  60, aliases: ["panko breadcrumbs", "panko crumbs", "japanese breadcrumbs"] },
  "breadcrumbs":        { gPerCup: 115, aliases: ["bread crumbs", "dry breadcrumbs", "italian breadcrumbs"] },

  // ── SUGARS ────────────────────────────────────────────────────────────────
  "granulated sugar":   { gPerCup: 200, aliases: ["sugar", "white sugar", "caster sugar", "castor sugar", "superfine sugar"] },
  "brown sugar":        { gPerCup: 220, aliases: ["light brown sugar", "dark brown sugar", "packed brown sugar", "soft brown sugar"] },
  "powdered sugar":     { gPerCup: 120, aliases: ["confectioners sugar", "confectioners' sugar", "icing sugar", "powdered sugar"] },
  "coconut sugar":      { gPerCup: 180, aliases: ["palm sugar", "coconut palm sugar"] },
  "raw sugar":          { gPerCup: 200, aliases: ["turbinado sugar", "demerara sugar", "raw cane sugar"] },

  // ── FATS & OILS ───────────────────────────────────────────────────────────
  "butter":             { gPerCup: 227, aliases: ["unsalted butter", "salted butter", "margarine", "vegan butter"] },
  "olive oil":          { gPerCup: 216, aliases: ["extra virgin olive oil", "evoo", "light olive oil"] },
  "vegetable oil":      { gPerCup: 218, aliases: ["canola oil", "sunflower oil", "corn oil", "neutral oil", "cooking oil", "rapeseed oil"] },
  "coconut oil":        { gPerCup: 218, aliases: ["coconut butter"] },
  "sesame oil":         { gPerCup: 218, aliases: ["toasted sesame oil", "dark sesame oil"] },
  "avocado oil":        { gPerCup: 218, aliases: [] },

  // ── DAIRY ─────────────────────────────────────────────────────────────────
  "milk":               { gPerCup: 245, aliases: ["whole milk", "2% milk", "skim milk", "dairy milk", "nonfat milk", "low fat milk", "reduced fat milk"] },
  "heavy cream":        { gPerCup: 238, aliases: ["heavy whipping cream", "double cream", "whipping cream", "pouring cream"] },
  "sour cream":         { gPerCup: 230, aliases: ["creme fraiche", "crème fraîche"] },
  "cream cheese":       { gPerCup: 232, aliases: [] },
  "shredded mozzarella":{ gPerCup: 113, aliases: ["mozzarella", "shredded mozzarella cheese", "fresh mozzarella"] },
  "shredded cheddar":   { gPerCup: 113, aliases: ["cheddar", "cheddar cheese", "shredded cheese", "grated cheddar"] },
  "parmesan":           { gPerCup: 100, aliases: ["parmigiano", "grated parmesan", "parmesan cheese", "parmigiano reggiano", "pecorino", "pecorino romano"] },
  "ricotta":            { gPerCup: 246, aliases: ["ricotta cheese"] },
  "plain yogurt":       { gPerCup: 245, aliases: ["yogurt", "greek yogurt", "yoghurt", "plain greek yogurt", "nonfat yogurt"] },
  "buttermilk":         { gPerCup: 245, aliases: [] },
  "condensed milk":     { gPerCup: 306, aliases: ["sweetened condensed milk"] },

  // ── GRAINS — dry ──────────────────────────────────────────────────────────
  "white rice":         { gPerCup: 185, aliases: ["rice", "dry rice", "uncooked rice", "jasmine rice", "basmati rice", "long grain rice", "short grain rice", "sushi rice", "arborio rice"] },
  "brown rice":         { gPerCup: 190, aliases: ["dry brown rice", "uncooked brown rice", "whole grain rice"] },
  "rolled oats":        { gPerCup:  90, aliases: ["oats", "old fashioned oats", "porridge oats", "quick oats", "instant oats"] },
  "steel cut oats":     { gPerCup: 175, aliases: ["steel-cut oats", "irish oats", "pinhead oats"] },
  "quinoa":             { gPerCup: 170, aliases: ["dry quinoa", "uncooked quinoa", "white quinoa", "red quinoa"] },
  "dry pasta":          { gPerCup: 100, aliases: ["pasta", "penne", "rigatoni", "rotini", "fusilli", "farfalle", "orzo", "elbow macaroni", "macaroni"] },
  "dry spaghetti":      { gPerCup:  95, aliases: ["spaghetti", "linguine", "fettuccine", "angel hair", "bucatini"] },
  "couscous":           { gPerCup: 175, aliases: ["dry couscous", "pearl couscous"] },
  "farro":              { gPerCup: 200, aliases: ["dry farro", "emmer"] },
  "barley":             { gPerCup: 184, aliases: ["pearl barley", "dry barley"] },

  // ── GRAINS — cooked  (same weight ≠ same volume as dry due to water uptake) ─
  "cooked white rice":  { gPerCup: 195, aliases: ["cooked rice", "steamed rice", "cooked jasmine rice", "cooked basmati rice"] },
  "cooked brown rice":  { gPerCup: 195, aliases: [] },
  "cooked quinoa":      { gPerCup: 185, aliases: [] },
  "cooked pasta":       { gPerCup: 250, aliases: ["cooked noodles", "cooked penne", "cooked spaghetti", "cooked fettuccine"] },
  "cooked couscous":    { gPerCup: 157, aliases: [] },
  "cooked farro":       { gPerCup: 210, aliases: [] },

  // ── LEGUMES — dry ─────────────────────────────────────────────────────────
  "dried lentils":      { gPerCup: 192, aliases: ["lentils", "red lentils", "green lentils", "brown lentils", "dry lentils", "french lentils", "black lentils"] },
  "dried chickpeas":    { gPerCup: 200, aliases: ["chickpeas", "garbanzo beans", "dry chickpeas", "garbanzo"] },
  "dried black beans":  { gPerCup: 185, aliases: ["black beans", "dry black beans"] },
  "dried kidney beans": { gPerCup: 185, aliases: ["kidney beans", "red kidney beans", "dry kidney beans"] },
  "dried cannellini":   { gPerCup: 185, aliases: ["cannellini beans", "white beans", "navy beans", "great northern beans"] },

  // ── LEGUMES — cooked / canned ─────────────────────────────────────────────
  "cooked lentils":     { gPerCup: 200, aliases: [] },
  "cooked chickpeas":   { gPerCup: 164, aliases: ["canned chickpeas", "canned garbanzo beans"] },
  "cooked black beans": { gPerCup: 172, aliases: ["canned black beans"] },
  "cooked kidney beans":{ gPerCup: 177, aliases: ["canned kidney beans"] },
  "cooked cannellini":  { gPerCup: 180, aliases: ["canned white beans", "canned cannellini"] },

  // ── PRODUCE — count → weight & volume ─────────────────────────────────────
  // mlPerUnit is the approximate volume when shredded/diced/prepared as commonly used

  "carrot":        { gPerUnit:  80, mlPerUnit: 120, aliases: ["carrots", "medium carrot"] },          // shredded ≈ ½ cup
  "baby carrot":   { gPerUnit:  10, mlPerUnit:  15, aliases: ["baby carrots"] },
  "onion":         { gPerUnit: 150, mlPerUnit: 240, aliases: ["onions", "yellow onion", "white onion", "medium onion", "brown onion", "cooking onion"] }, // diced ≈ 1 cup
  "red onion":     { gPerUnit: 150, mlPerUnit: 240, aliases: ["red onions", "purple onion"] },
  "shallot":       { gPerUnit:  30, mlPerUnit:  60, aliases: ["shallots", "french shallot", "eschalot"] },
  "garlic clove":  { gPerUnit:   5, mlPerUnit:   5, aliases: ["garlic", "clove of garlic", "garlic cloves"] }, // minced ≈ 1 tsp
  "head of garlic":{ gPerUnit:  45, aliases: ["garlic bulb", "garlic head", "bulb of garlic"] },
  "tomato":        { gPerUnit: 120, mlPerUnit: 180, aliases: ["tomatoes", "roma tomato", "medium tomato", "plum tomato", "beefsteak tomato", "vine tomato"] },
  "cherry tomato": { gPerUnit:  15, mlPerUnit:  15, aliases: ["cherry tomatoes", "grape tomatoes"] },
  "sun-dried tomato":{ gPerUnit: 5, aliases: ["sun dried tomato", "sundried tomato", "sun-dried tomatoes"] },
  "potato":        { gPerUnit: 170, aliases: ["potatoes", "russet potato", "medium potato", "yukon gold potato", "white potato", "idaho potato"] },
  "sweet potato":  { gPerUnit: 130, aliases: ["sweet potatoes", "yam", "yams", "kumara"] },
  "apple":         { gPerUnit: 182, aliases: ["apples", "medium apple", "granny smith apple", "fuji apple", "gala apple"] },
  "pear":          { gPerUnit: 178, aliases: ["pears", "medium pear", "bosc pear"] },
  "banana":        { gPerUnit: 118, aliases: ["bananas", "medium banana"] },
  "lemon":         { gPerUnit:  85, mlPerUnit:  45, aliases: ["lemons", "medium lemon"] },   // juice ≈ 3 tbsp
  "lime":          { gPerUnit:  67, mlPerUnit:  30, aliases: ["limes", "medium lime"] },     // juice ≈ 2 tbsp
  "orange":        { gPerUnit: 130, aliases: ["oranges", "medium orange", "navel orange", "blood orange"] },
  "zucchini":      { gPerUnit: 200, aliases: ["courgette", "zucchinis", "medium zucchini", "summer squash", "courgettes"] },
  "cucumber":      { gPerUnit: 200, aliases: ["cucumbers", "english cucumber", "persian cucumber", "lebanese cucumber"] },
  "celery stalk":  { gPerUnit:  40, aliases: ["celery", "stalk of celery", "rib of celery", "celery stalks", "celery ribs", "celery stick"] },
  "bell pepper":   { gPerUnit: 150, aliases: ["bell peppers", "capsicum", "red pepper", "green pepper", "yellow pepper", "orange pepper", "red bell pepper", "green bell pepper"] },
  "jalapeño":      { gPerUnit:  14, aliases: ["jalapeno", "jalapeños", "jalapenos", "jalapeño pepper"] },
  "serrano":       { gPerUnit:   7, aliases: ["serrano pepper", "serrano chile"] },
  "mushroom":      { gPerUnit:  20, mlPerUnit:  80, aliases: ["mushrooms", "cremini mushroom", "button mushroom", "white mushroom", "crimini mushroom", "brown mushroom"] },
  "portobello":    { gPerUnit: 100, aliases: ["portobello mushroom", "portabella", "portobello cap"] },
  "avocado":       { gPerUnit: 150, aliases: ["avocados", "hass avocado"] },
  "egg":           { gPerUnit:  50, aliases: ["eggs", "large egg", "medium egg", "whole egg"] },
  "egg white":     { gPerUnit:  30, mlPerUnit: 30, aliases: ["egg whites"] },
  "egg yolk":      { gPerUnit:  18, aliases: ["egg yolks"] },
  "corn cob":      { gPerUnit: 100, aliases: ["ear of corn", "corn on the cob", "corn cobs", "ears of corn", "corn kernels"] },
  "green onion":   { gPerUnit:  15, mlPerUnit:  15, aliases: ["scallion", "scallions", "spring onion", "spring onions", "green onions"] },
  "leek":          { gPerUnit: 100, aliases: ["leeks", "medium leek"] },
  "broccoli":      { gPerUnit: 340, mlPerUnit: 720, aliases: ["broccoli head", "head of broccoli", "broccoli florets", "broccoli crown"] },  // ≈ 3 cups florets
  "cauliflower":   { gPerUnit: 625, mlPerUnit: 1200, aliases: ["cauliflower head", "head of cauliflower", "cauliflower florets"] },          // ≈ 5 cups florets
  "asparagus":     { gPerUnit:  20, aliases: ["asparagus spear", "asparagus spears", "asparagus stalks"] },
  "eggplant":      { gPerUnit: 300, aliases: ["aubergine", "eggplants", "chinese eggplant", "japanese eggplant"] },

  // ── PRODUCE — pre-prepared (volume → weight) ──────────────────────────────
  "shredded carrot":   { gPerCup: 110, mlPerUnit: 120, aliases: ["grated carrot", "shredded carrots", "grated carrots"] },
  "diced onion":       { gPerCup: 160, aliases: ["chopped onion", "minced onion", "diced onions", "chopped onions"] },
  "sliced mushroom":   { gPerCup:  70, aliases: ["sliced mushrooms", "chopped mushrooms"] },
  "spinach":           { gPerCup:  30, aliases: ["baby spinach", "fresh spinach", "spinach leaves", "loose spinach"] },
  "kale":              { gPerCup:  67, aliases: ["kale leaves", "curly kale", "tuscan kale", "lacinato kale"] },
  "shredded cabbage":  { gPerCup:  89, aliases: ["cabbage", "green cabbage", "red cabbage", "napa cabbage", "savoy cabbage"] },
  "mixed greens":      { gPerCup:  20, aliases: ["salad greens", "mesclun", "arugula", "rocket", "lettuce", "romaine", "iceberg"] },

  // ── PROTEINS ──────────────────────────────────────────────────────────────
  "ground beef":       { gPerCup: 230, aliases: ["beef mince", "minced beef", "hamburger meat", "lean ground beef", "extra lean ground beef"] },
  "ground pork":       { gPerCup: 230, aliases: ["pork mince", "minced pork", "pork sausage meat"] },
  "ground turkey":     { gPerCup: 224, aliases: ["turkey mince", "minced turkey"] },
  "ground chicken":    { gPerCup: 224, aliases: ["chicken mince", "minced chicken"] },
  "ground lamb":       { gPerCup: 230, aliases: ["lamb mince", "minced lamb"] },
  "shredded chicken":  { gPerCup: 140, aliases: ["pulled chicken", "rotisserie chicken", "cooked shredded chicken", "leftover chicken"] },
  "chicken breast":    { gPerUnit: 170, aliases: ["chicken breasts", "boneless chicken breast", "skinless chicken breast", "boneless skinless chicken breast"] },
  "chicken thigh":     { gPerUnit: 100, aliases: ["chicken thighs", "boneless chicken thigh", "skinless chicken thigh"] },
  "tofu":              { gPerCup: 248, aliases: ["firm tofu", "extra firm tofu", "silken tofu", "soft tofu", "medium tofu"] },

  // ── NUTS & SEEDS ──────────────────────────────────────────────────────────
  "almonds":           { gPerCup: 143, aliases: ["whole almonds", "sliced almonds", "slivered almonds"] },
  "walnuts":           { gPerCup: 100, aliases: ["walnut halves", "chopped walnuts"] },
  "pecans":            { gPerCup:  99, aliases: ["pecan halves", "chopped pecans"] },
  "cashews":           { gPerCup: 130, aliases: ["whole cashews", "raw cashews", "roasted cashews"] },
  "peanuts":           { gPerCup: 146, aliases: ["whole peanuts", "roasted peanuts"] },
  "pine nuts":         { gPerCup: 136, aliases: ["pignoli"] },
  "sunflower seeds":   { gPerCup: 140, aliases: ["sunflower seed"] },
  "sesame seeds":      { gPerCup: 144, aliases: ["sesame seed", "white sesame", "black sesame"] },
  "chia seeds":        { gPerCup: 160, aliases: ["chia seed"] },
  "flaxseeds":         { gPerCup: 155, aliases: ["flax seeds", "linseeds"] },

  // ── LIQUIDS ───────────────────────────────────────────────────────────────
  "water":             { gPerCup: 240, aliases: [] },
  "chicken broth":     { gPerCup: 240, aliases: ["chicken stock", "chicken bone broth"] },
  "vegetable broth":   { gPerCup: 240, aliases: ["vegetable stock", "veggie broth", "veg stock"] },
  "beef broth":        { gPerCup: 240, aliases: ["beef stock", "beef bone broth"] },
  "broth":             { gPerCup: 240, aliases: ["stock", "bone broth"] },
  "coconut milk":      { gPerCup: 240, aliases: ["full fat coconut milk", "light coconut milk", "canned coconut milk"] },
  "coconut cream":     { gPerCup: 240, aliases: [] },
  "honey":             { gPerCup: 340, aliases: ["raw honey"] },
  "maple syrup":       { gPerCup: 315, aliases: ["pure maple syrup"] },
  "soy sauce":         { gPerCup: 255, aliases: ["tamari", "shoyu", "low sodium soy sauce", "dark soy sauce", "light soy sauce"] },
  "fish sauce":        { gPerCup: 270, aliases: ["nam pla"] },
  "vinegar":           { gPerCup: 240, aliases: ["apple cider vinegar", "white vinegar", "rice vinegar", "balsamic vinegar", "red wine vinegar", "white wine vinegar", "distilled vinegar"] },
  "lemon juice":       { gPerCup: 244, aliases: ["fresh lemon juice"] },
  "lime juice":        { gPerCup: 244, aliases: ["fresh lime juice"] },

  // ── CONDIMENTS & PASTES ───────────────────────────────────────────────────
  "peanut butter":     { gPerCup: 258, aliases: ["natural peanut butter", "smooth peanut butter", "creamy peanut butter", "crunchy peanut butter"] },
  "tahini":            { gPerCup: 240, aliases: ["sesame paste", "sesame tahini"] },
  "tomato paste":      { gPerCup: 262, aliases: ["double concentrate tomato paste"] },
  "tomato sauce":      { gPerCup: 245, aliases: ["marinara sauce", "pasta sauce", "crushed tomatoes", "tomato puree", "passata", "canned tomatoes", "diced tomatoes"] },
  "ketchup":           { gPerCup: 272, aliases: ["catsup", "tomato ketchup"] },
  "miso paste":        { gPerCup: 270, aliases: ["miso", "white miso", "red miso", "yellow miso"] },
  "sriracha":          { gPerCup: 260, aliases: ["hot sauce", "chili sauce", "chilli sauce", "tabasco"] },
  "hoisin sauce":      { gPerCup: 260, aliases: [] },
  "oyster sauce":      { gPerCup: 275, aliases: [] },
  "worcestershire sauce": { gPerCup: 255, aliases: ["worcestershire"] },
  "gochujang":         { gPerCup: 270, aliases: ["gochujang paste", "korean chili paste"] },
  "sambal oelek":      { gPerCup: 260, aliases: ["sambal", "chili paste"] },

};

// Words describing preparation method or size that can be stripped when matching fails
const STRIP_RE = /\b(fresh|frozen|dried|organic|baby|raw|ripe|whole|large|medium|small|extra|firm|soft|silken|lean|boneless|skinless|peeled|seeded|pitted|trimmed|thinly|roughly|finely|cut|into|cubes?|chunks?|pieces?|strips?|florets?|stalks?|rinsed|drained|blanched|roasted|sauteed|saut[eé]ed|halved|quartered|sliced|loosely|tightly|packed)\b/g;

/**
 * Fuzzy-match an ingredient name against the density table.
 *
 * Strategy (stops at first hit):
 *  1. Exact key match
 *  2. Exact alias match
 *  3. Substring: name contains a key or alias (longest match wins)
 *  4. Strip prep/size words → repeat 1-3 on cleaned string
 *
 * Returns null when no match is found (callers fall back to existence check).
 */
export function lookupDensity(ingredientName: string): DensityEntry | null {
  const name = ingredientName.toLowerCase().trim();
  return _lookup(name) ?? _lookup(name.replace(STRIP_RE, " ").replace(/\s+/g, " ").trim());
}

function _lookup(name: string): DensityEntry | null {
  if (!name || name.length < 2) return null;

  // 1. Exact key
  if (DENSITIES[name]) return DENSITIES[name];

  // 2. Exact alias
  for (const entry of Object.values(DENSITIES)) {
    if (entry.aliases.includes(name)) return entry;
  }

  // 3. Substring — longest key/alias contained in name wins (more specific)
  let best: DensityEntry | null = null;
  let bestLen = 0;

  for (const [key, entry] of Object.entries(DENSITIES)) {
    if (name.includes(key) && key.length > bestLen) {
      best = entry; bestLen = key.length;
    }
    for (const alias of entry.aliases) {
      if (name.includes(alias) && alias.length > bestLen) {
        best = entry; bestLen = alias.length;
      }
    }
  }

  return best;
}
