-- ==========================================
-- Open-Cost Master: Full Database Schema (Reinitialization)
-- Description: Consolidates all tables, RBAC, and store isolation logic.
-- ==========================================

-- 0. Clean up (Optional - Uncomment if you want a complete reset)
-- DROP TABLE IF EXISTS public.purchase_items CASCADE;
-- DROP TABLE IF EXISTS public.purchases CASCADE;
-- DROP TABLE IF EXISTS public.stock_adjustment_logs CASCADE;
-- DROP TABLE IF EXISTS public.order_items CASCADE;
-- DROP TABLE IF EXISTS public.orders CASCADE;
-- DROP TABLE IF EXISTS public.sales_records CASCADE;
-- DROP TABLE IF EXISTS public.expense_records CASCADE;
-- DROP TABLE IF EXISTS public.expense_categories CASCADE;
-- DROP TABLE IF EXISTS public.recipe_ingredients CASCADE;
-- DROP TABLE IF EXISTS public.recipes CASCADE;
-- DROP TABLE IF EXISTS public.ingredients CASCADE;
-- DROP TABLE IF EXISTS public.categories CASCADE;
-- DROP TABLE IF EXISTS public.store_staff CASCADE;
-- DROP TABLE IF EXISTS public.stores CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles Table (Global User Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner', 'manager', 'staff')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Stores Table (Multi-Store Support)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    business_number TEXT,
    address TEXT,
    contact TEXT,
    monthly_fixed_cost NUMERIC DEFAULT 0,
    monthly_target_sales_count INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Store Staff Table (Mapping Users to Stores and Roles)
CREATE TABLE IF NOT EXISTS public.store_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, user_id)
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('ingredient', 'menu', 'prep')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Ingredients Table
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    purchase_price NUMERIC DEFAULT 0,
    purchase_unit TEXT NOT NULL,
    usage_unit TEXT NOT NULL,
    conversion_factor NUMERIC DEFAULT 1,
    loss_rate NUMERIC DEFAULT 0,
    current_stock NUMERIC DEFAULT 0,
    safety_stock NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Recipes Table (Menu/Prep)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('menu', 'prep')),
    category_id UUID REFERENCES public.categories(id),
    selling_price NUMERIC,
    target_cost_rate NUMERIC,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Recipe Ingredients Table (BOM)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
    item_id UUID NOT NULL, -- Can be ingredient_id or recipe_id (sub-menu)
    item_type TEXT CHECK (item_type IN ('ingredient', 'menu', 'prep')),
    quantity NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_amount NUMERIC DEFAULT 0,
    is_fixed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Expense Records
CREATE TABLE IF NOT EXISTS public.expense_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Added
    category_id UUID REFERENCES public.expense_categories(id),
    amount NUMERIC NOT NULL,
    expense_date DATE NOT NULL,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Sales Records
CREATE TABLE IF NOT EXISTS public.sales_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Added
    sales_date DATE NOT NULL,
    daily_revenue NUMERIC DEFAULT 0,
    daily_cogs NUMERIC DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Purchases (Inventory Input)
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Added
    supplier_name TEXT,
    purchase_date DATE NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Purchase Items
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Stock Adjustment Logs
CREATE TABLE IF NOT EXISTS public.stock_adjustment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('purchase', 'manual', 'waste', 'usage', 'correction', 'loss', 'discard')),
    quantity NUMERIC NOT NULL,
    prev_stock NUMERIC,
    new_stock NUMERIC,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustment_logs ENABLE ROW LEVEL SECURITY;

-- 14. Global Role & Access Helpers (Recursion-proof)
-- Use SECURITY DEFINER and SET search_path to ensure these functions bypass RLS
-- and execute with owner privileges (postgres), breaking the recursion loop.

-- Explicitly drop functions to avoid parameter name mismatch errors
DROP FUNCTION IF EXISTS public.get_auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_store_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.check_hierarchical_access(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  -- This queries profiles bypassing RLS because of SECURITY DEFINER
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_store_owner(t_store_id UUID)
RETURNS BOOLEAN AS $$
  -- This queries store_staff bypassing RLS because of SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM public.store_staff 
    WHERE store_id = t_store_id AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_hierarchical_access(t_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super Admin check
    IF (public.get_auth_role() = 'super_admin') THEN
        RETURN TRUE;
    END IF;

    -- Standard staff check (Queries store_staff bypassing RLS)
    RETURN EXISTS (
        SELECT 1 FROM public.store_staff 
        WHERE store_id = t_store_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15. Create RLS Policies using the safe helpers
DO $$ 
DECLARE
    tbl_name TEXT;
    pol_rec RECORD;
    table_list TEXT[] := ARRAY[
        'categories', 'ingredients', 'recipes', 'recipe_ingredients',
        'expense_categories', 'expense_records', 'sales_records', 
        'purchases', 'purchase_items', 'stock_adjustment_logs', 'store_staff', 'profiles', 'stores'
    ];
BEGIN
    -- [CRITICAL] Global RLS Policy Reset: Nuke all existing policies on these tables
    FOR pol_rec IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = ANY(table_list)
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_rec.policyname, pol_rec.tablename);
    END LOOP;

    -- Re-fetch for common tables with store_id
    table_list := ARRAY[
        'categories', 'ingredients', 'recipes', 
        'expense_categories', 'expense_records', 'sales_records', 
        'purchases'
    ];

    FOREACH tbl_name IN ARRAY table_list
    LOOP
        EXECUTE format('CREATE POLICY "Hierarchical Access Policy" ON public.%I FOR ALL TO authenticated USING (public.check_hierarchical_access(store_id))', tbl_name);
    END LOOP;

    -- Special policy for recipe_ingredients (joins via recipe_id)
    CREATE POLICY "Hierarchical Access Policy" ON public.recipe_ingredients 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = public.recipe_ingredients.recipe_id AND public.check_hierarchical_access(r.store_id)));

    -- Special policy for purchase_items (joins via purchase_id)
    CREATE POLICY "Hierarchical Access Policy" ON public.purchase_items 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = public.purchase_items.purchase_id AND public.check_hierarchical_access(p.store_id)));

    -- Special policy for stock_adjustment_logs (joins via ingredient_id)
    CREATE POLICY "Hierarchical Access Policy" ON public.stock_adjustment_logs 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.ingredients i WHERE i.id = public.stock_adjustment_logs.ingredient_id AND public.check_hierarchical_access(i.store_id)));

    -- Special policy for store_staff (uses safe helpers)
    DROP POLICY IF EXISTS "Hierarchical Access Policy" ON public.store_staff;
    DROP POLICY IF EXISTS "safe_staff_access" ON public.store_staff;
    CREATE POLICY "Hierarchical Access Policy" ON public.store_staff 
    FOR ALL TO authenticated 
    USING (
        user_id = auth.uid()
        OR public.get_auth_role() = 'super_admin'
        OR public.is_store_owner(store_id)
    );
END $$;

-- Special Policies for Meta-tables
DROP POLICY IF EXISTS "Profiles Access Policy" ON public.profiles;
DROP POLICY IF EXISTS "safe_profiles_access" ON public.profiles;
CREATE POLICY "Profiles Access Policy" ON public.profiles 
FOR ALL TO authenticated 
USING (id = auth.uid() OR public.get_auth_role() = 'super_admin');

DROP POLICY IF EXISTS "Stores Hierarchy" ON public.stores;
DROP POLICY IF EXISTS "safe_stores_access" ON public.stores;
CREATE POLICY "Stores Hierarchy" ON public.stores 
FOR ALL TO authenticated 
USING (public.check_hierarchical_access(id));

-- 16. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
