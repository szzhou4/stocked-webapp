-- Add save_for_later column to shopping_items
ALTER TABLE shopping_items
  ADD COLUMN IF NOT EXISTS saved_for_later BOOLEAN NOT NULL DEFAULT FALSE;
