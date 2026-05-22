-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Recipes
create table recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  source_url text,
  image_url text,
  servings numeric(6,2) not null default 4,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Recipe ingredients
create table recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  name text not null,
  quantity numeric(10,3),
  unit text,
  notes text,
  sort_order integer default 0
);

-- Pantry items
create table pantry_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity numeric(10,3) not null default 0,
  unit text,
  min_quantity numeric(10,3) default 0,
  category text not null default 'other',
  store text not null default 'generic',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Shopping list items
create table shopping_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity numeric(10,3),
  unit text,
  store text not null default 'generic',
  category text not null default 'other',
  checked boolean default false not null,
  purchased_quantity numeric(10,3),
  purchased_unit text,
  pantry_item_id uuid references pantry_items(id) on delete set null,
  recipe_id uuid references recipes(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Recipe use log
create table recipe_uses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_id uuid references recipes(id) on delete cascade not null,
  servings_made numeric(6,2) not null,
  original_servings numeric(6,2) not null,
  used_at timestamptz default now() not null
);

-- Row Level Security
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table pantry_items enable row level security;
alter table shopping_items enable row level security;
alter table recipe_uses enable row level security;

-- RLS policies: users only access their own data
create policy "recipes: own data" on recipes for all using (auth.uid() = user_id);
create policy "recipe_ingredients: own data" on recipe_ingredients for all
  using (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()));
create policy "pantry_items: own data" on pantry_items for all using (auth.uid() = user_id);
create policy "shopping_items: own data" on shopping_items for all using (auth.uid() = user_id);
create policy "recipe_uses: own data" on recipe_uses for all using (auth.uid() = user_id);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger recipes_updated_at before update on recipes
  for each row execute function set_updated_at();
create trigger pantry_items_updated_at before update on pantry_items
  for each row execute function set_updated_at();
