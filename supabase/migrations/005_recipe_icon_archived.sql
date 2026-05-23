-- Recipe icon: stores a key like "utensils", "egg", "soup", etc.
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS icon text;

-- Archived flag: hides recipe from main list without deleting it
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
