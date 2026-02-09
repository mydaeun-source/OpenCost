-- [Open-Cost Master] Database Reset Script (Consolidated)
-- 🚨 WARNING: This script will DELETE ALL DATA and re-create all tables.
-- Run this in the Supabase SQL Editor to reset the entire database to the latest schema.

-- 1. Drop Existing Tables (Cascade to remove dependencies)
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.purchase_items cascade;
drop table if exists public.purchases cascade;
drop table if exists public.stock_adjustment_logs cascade;
drop table if exists public.recipe_ingredients cascade;
drop table if exists public.recipes cascade;
drop table if exists public.ingredients cascade;
drop table if exists public.categories cascade;
drop table if exists public.expense_records cascade;
drop table if exists public.expense_categories cascade;
drop table if exists public.sales_records cascade;
drop table if exists public.store_settings cascade;

-- 2. Extensions & Global Functions
create extension if not exists "uuid-ossp";

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. Create Tables

-- A. Categories
create table public.categories (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    name text not null,
    type text not null check (type in ('ingredient', 'menu', 'prep')),
    created_at timestamptz not null default now()
);

-- B. Ingredients
create table public.ingredients (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    purchase_price numeric not null default 0,
    purchase_unit text not null,
    usage_unit text not null,
    conversion_factor numeric not null default 1,
    loss_rate numeric not null default 0 check (loss_rate >= 0 and loss_rate < 1),
    current_stock numeric not null default 0,
    safety_stock numeric not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- C. Recipes
create table public.recipes (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    type text not null check (type in ('menu', 'prep')),
    selling_price numeric default 0,
    target_cost_rate numeric,
    description text,
    created_at timestamptz not null default now()
);

-- D. Recipe Ingredients
create table public.recipe_ingredients (
    id uuid primary key default uuid_generate_v4(),
    recipe_id uuid not null references public.recipes(id) on delete cascade,
    item_id uuid not null,
    item_type text not null check (item_type in ('ingredient', 'menu', 'prep')),
    quantity numeric not null,
    created_at timestamptz not null default now()
);

-- E. Store Settings
create table public.store_settings (
    user_id uuid primary key references auth.users(id) on delete cascade,
    monthly_fixed_cost numeric default 0,
    monthly_target_sales_count numeric default 1000,
    updated_at timestamptz not null default now()
);

-- F. Sales Records
create table public.sales_records (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    sales_date date not null,
    daily_revenue numeric(12, 2) not null default 0,
    daily_cogs numeric(12, 2) not null default 0,
    memo text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_sales_date_per_user unique (user_id, sales_date)
);

-- G. Expense Categories
create table public.expense_categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    default_amount numeric,
    is_fixed boolean default false,
    created_at timestamptz not null default now()
);

-- H. Expense Records
create table public.expense_records (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category_id uuid references public.expense_categories(id) on delete set null,
    amount numeric not null,
    expense_date date not null default current_date,
    memo text,
    created_at timestamptz not null default now()
);

-- I. Orders
create table public.orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    total_amount numeric(12, 2) not null default 0,
    total_cost numeric(12, 2) not null default 0,
    payment_method text check (payment_method in ('card', 'cash', 'transfer')),
    status text not null default 'completed' check (status in ('completed', 'cancelled')),
    created_at timestamptz not null default now()
);

-- J. Order Items
create table public.order_items (
    id uuid primary key default uuid_generate_v4(),
    order_id uuid not null references public.orders(id) on delete cascade,
    menu_id uuid references public.recipes(id) on delete set null,
    quantity integer not null default 1,
    price numeric(12, 2) not null,
    created_at timestamptz not null default now()
);

-- K. Purchases
create table public.purchases (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    supplier_name text,
    purchase_date date not null default current_date,
    total_amount numeric not null default 0,
    status text not null default 'completed' check (status in ('completed', 'draft')),
    created_at timestamptz not null default now()
);

-- L. Purchase Items
create table public.purchase_items (
    id uuid primary key default uuid_generate_v4(),
    purchase_id uuid not null references public.purchases(id) on delete cascade,
    ingredient_id uuid not null references public.ingredients(id) on delete cascade,
    quantity numeric not null,
    price numeric not null,
    created_at timestamptz not null default now()
);

-- M. Stock Adjustment Logs
create table public.stock_adjustment_logs (
    id uuid primary key default uuid_generate_v4(),
    ingredient_id uuid not null references public.ingredients(id) on delete cascade,
    adjustment_type text not null check (adjustment_type in ('purchase', 'spoilage', 'order', 'correction', 'refund')),
    quantity numeric not null,
    reason text,
    created_at timestamptz not null default now()
);

-- 4. RLS & Policies
alter table public.categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.store_settings enable row level security;
alter table public.sales_records enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_records enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.stock_adjustment_logs enable row level security;

create policy "All categories" on categories for all using (auth.uid() = user_id);
create policy "All ingredients" on ingredients for all using (auth.uid() = user_id);
create policy "All recipes" on recipes for all using (auth.uid() = user_id);
create policy "All recipe_ingredients" on recipe_ingredients for all using (exists (select 1 from public.recipes where recipes.id = recipe_id and user_id = auth.uid()));
create policy "All settings" on store_settings for all using (auth.uid() = user_id);
create policy "All sales" on sales_records for all using (auth.uid() = user_id);
create policy "All expense_categories" on expense_categories for all using (auth.uid() = user_id);
create policy "All expense_records" on expense_records for all using (auth.uid() = user_id);
create policy "All orders" on orders for all using (auth.uid() = user_id);
create policy "All order_items" on order_items for all using (exists (select 1 from public.orders where orders.id = order_id and user_id = auth.uid()));
create policy "All purchases" on purchases for all using (auth.uid() = user_id);
create policy "All purchase_items" on purchase_items for all using (exists (select 1 from public.purchases where purchases.id = purchase_id and user_id = auth.uid()));
create policy "All stock logs" on stock_adjustment_logs for all using (exists (select 1 from public.ingredients where ingredients.id = ingredient_id and user_id = auth.uid()));

-- 5. Indexes
create index if not exists idx_ing_user on ingredients(user_id);
create index if not exists idx_rec_user on recipes(user_id);
create index if not exists idx_rec_ing_rec on recipe_ingredients(recipe_id);
create index if not exists idx_sales_user_date on sales_records(user_id, sales_date);
create index if not exists idx_orders_user_created on orders(user_id, created_at);
create index if not exists idx_purchases_user_date on purchases(user_id, purchase_date);

-- 6. Triggers
create trigger set_sales_updated_at before update on public.sales_records for each row execute function public.handle_updated_at();
create trigger set_ingredients_updated_at before update on public.ingredients for each row execute function public.handle_updated_at();

-- Done!
