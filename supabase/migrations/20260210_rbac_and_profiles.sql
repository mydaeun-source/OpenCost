-- 1. Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    business_number TEXT,
    address TEXT,
    contact TEXT,
    monthly_fixed_cost NUMERIC DEFAULT 0,
    monthly_target_sales_count INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Store Staff Table (Mapping Users to Stores and Roles)
CREATE TABLE IF NOT EXISTS public.store_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, user_id)
);

-- 3. Profiles Table (Global User Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner', 'manager', 'staff')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Add store_id to existing tables if missing
DO $$ 
BEGIN
    -- ingredients
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ingredients') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='ingredients' AND column_name='store_id') THEN
            ALTER TABLE public.ingredients ADD COLUMN store_id UUID REFERENCES public.stores(id);
        END IF;
    END IF;

    -- recipes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recipes') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='recipes' AND column_name='store_id') THEN
            ALTER TABLE public.recipes ADD COLUMN store_id UUID REFERENCES public.stores(id);
        END IF;
    END IF;

    -- sales_records
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_records') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='sales_records' AND column_name='store_id') THEN
            ALTER TABLE public.sales_records ADD COLUMN store_id UUID REFERENCES public.stores(id);
        END IF;
    END IF;

    -- expense_records
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_records') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='expense_records' AND column_name='store_id') THEN
            ALTER TABLE public.expense_records ADD COLUMN store_id UUID REFERENCES public.stores(id);
        END IF;
    END IF;

    -- expense_categories
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expense_categories') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='expense_categories' AND column_name='store_id') THEN
            ALTER TABLE public.expense_categories ADD COLUMN store_id UUID REFERENCES public.stores(id);
        END IF;
    END IF;
END $$;

-- 6. Advanced Hierarchical RLS Policies
-- General logic: Super Admin sees all, Owner/Staff restricted by store/role.

-- Example: Ingredients Table Policy
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ingredients') THEN
        DROP POLICY IF EXISTS "Hierarchical Access for Ingredients" ON public.ingredients;
        CREATE POLICY "Hierarchical Access for Ingredients" ON public.ingredients
        FOR ALL TO authenticated
        USING (
          -- Super Admin can see anything
          (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
          OR
          -- Staff/Owner can see their assigned store data
          EXISTS (
            SELECT 1 FROM public.store_staff ss
            WHERE ss.store_id = ingredients.store_id 
            AND ss.user_id = auth.uid()
          )
        );
    END IF;
END $$;

-- Apply similar logic to other tables (Sales, Expenses, Recipes, etc.)
-- (Note: In a real production environment, we would iterate through all tables)

-- 4. Initial Seed for Admin (Optional reference)
-- UPDATE public.profiles SET role = 'super_admin' WHERE id = 'YOUR_UUID_HERE';
