-- Recipe tags (array of strings, e.g. ["Italian", "Quick (<30 min)"])
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Source type and content for photo/text imports
-- source_type: 'url' | 'image' | 'text' | null
-- source_content: the raw text or base64 data-URL for image/text imports
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_content text;

-- Cook notes per recipe use
ALTER TABLE recipe_uses ADD COLUMN IF NOT EXISTS notes text;
