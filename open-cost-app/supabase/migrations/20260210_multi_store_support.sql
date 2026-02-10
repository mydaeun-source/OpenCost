-- [Phase 41] Multi-Store & Staff Management Migration
-- This script migrates the database to support multiple business locations and staff roles.

-- 1. Create Stores Table
create table if not exists public.stores (
    id uuid primary key default uuid_generate_v4(),
    owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    name text not null,
    business_number text,
    address text,
    contact text,
    monthly_fixed_cost numeric default 0,
    monthly_target_sales_count numeric default 1000,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Create Store Staff Table (RBAC)
create table if not exists public.store_staff (
    id uuid primary key default uuid_generate_v4(),
    store_id uuid not null references public.stores(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'manager', 'staff')),
    permissions jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    unique(store_id, user_id)
);

-- 3. Add store_id to existing tables (Nullable initially for migration)
alter table public.categories add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.ingredients add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.recipes add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.sales_records add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.expense_categories add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.expense_records add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.orders add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.purchases add column if not exists store_id uuid references public.stores(id) on delete cascade;

-- 4. Initial Migration Logic (Run this carefully or via Edge Function)
-- Strategy: Create a default store for every user who already has data.

do $$
declare
    u_id uuid;
    s_id uuid;
begin
    for u_id in select distinct user_id from public.ingredients 
                union select distinct user_id from public.recipes 
                union select distinct user_id from public.sales_records
                union select distinct user_id from public.expense_records
                union select id from auth.users
    loop
        -- Create a default store for the user if they don't have one
        insert into public.stores (owner_id, name)
        values (u_id, '기본 사업장')
        returning id into s_id;

        -- Add owner to store_staff
        insert into public.store_staff (store_id, user_id, role)
        values (s_id, u_id, 'owner');

        -- Link existing records
        update public.categories set store_id = s_id where user_id = u_id;
        update public.ingredients set store_id = s_id where user_id = u_id;
        update public.recipes set store_id = s_id where user_id = u_id;
        update public.sales_records set store_id = s_id where user_id = u_id;
        update public.expense_categories set store_id = s_id where user_id = u_id;
        update public.expense_records set store_id = s_id where user_id = u_id;
        update public.orders set store_id = s_id where user_id = u_id;
        update public.purchases set store_id = s_id where user_id = u_id;
        
        -- Move fixed costs from store_settings to the new store table if needed
        -- This logic depends on how you want to handle the legacy store_settings table
    end loop;
end $$;

-- 5. Enable RLS and Configure New Policies
alter table public.stores enable row level security;
alter table public.store_staff enable row level security;

-- Function to check store access
create or replace function public.check_store_access(target_store_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from public.store_staff
        where store_id = target_store_id
        and user_id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- Store Policies
create policy "Users can view stores they belong to" on public.stores
    for select using (public.check_store_access(id));

create policy "Owners can update their stores" on public.stores
    for update using (
        exists (
            select 1 from public.store_staff
            where store_id = public.stores.id
            and user_id = auth.uid()
            and role = 'owner'
        )
    );

-- Data Table Policies (Update existing ones)
-- Example for ingredients:
drop policy if exists "Users can manage own ingredients" on ingredients;
create policy "Users can manage store ingredients" on ingredients
    for all using (public.check_store_access(store_id));

-- (Repeat for other tables...)
-- categories, recipes, sales_records, expense_categories, expense_records, orders, purchases

-- 6. Cleanup (Optional: Drop old store_settings if metrics moved to stores)
-- drop table public.store_settings;
