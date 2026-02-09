-- Create purchases table
create table if not exists public.purchases (
    id uuid not null default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    supplier_name text,
    purchase_date date not null default current_date,
    total_amount numeric not null default 0,
    status text not null default 'completed' check (status in ('completed', 'draft')),
    created_at timestamptz not null default now(),
    primary key (id)
);

-- Create purchase_items table
create table if not exists public.purchase_items (
    id uuid not null default uuid_generate_v4(),
    purchase_id uuid not null references public.purchases(id) on delete cascade,
    ingredient_id uuid not null references public.ingredients(id) on delete cascade,
    quantity numeric not null,
    price numeric not null, -- Purchase price at time of entry
    created_at timestamptz not null default now(),
    primary key (id)
);

-- Enable RLS
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

-- Policies for purchases
create policy "Users can view their own purchases"
    on public.purchases for select
    using (auth.uid() = user_id);

create policy "Users can insert their own purchases"
    on public.purchases for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own purchases"
    on public.purchases for update
    using (auth.uid() = user_id);

create policy "Users can delete their own purchases"
    on public.purchases for delete
    using (auth.uid() = user_id);

-- Policies for purchase_items
-- Since purchase_items are linked to purchases, we check ownership via the purchase table
create policy "Users can view their own purchase items"
    on public.purchase_items for select
    using (
        exists (
            select 1 from public.purchases
            where id = purchase_id and user_id = auth.uid()
        )
    );

create policy "Users can insert their own purchase items"
    on public.purchase_items for insert
    with check (
        exists (
            select 1 from public.purchases
            where id = purchase_id and user_id = auth.uid()
        )
    );

create policy "Users can update their own purchase items"
    on public.purchase_items for update
    using (
        exists (
            select 1 from public.purchases
            where id = purchase_id and user_id = auth.uid()
        )
    );

create policy "Users can delete their own purchase items"
    on public.purchase_items for delete
    using (
        exists (
            select 1 from public.purchases
            where id = purchase_id and user_id = auth.uid()
        )
    );

-- Indexes
create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_date_idx on public.purchases(purchase_date);
create index if not exists purchase_items_purchase_id_idx on public.purchase_items(purchase_id);
create index if not exists purchase_items_ingredient_id_idx on public.purchase_items(ingredient_id);
