-- ==========================================
-- Migration: Restore Missing Order Tables
-- Description: Defines orders and order_items required for analytics and sales tracking.
-- ==========================================

-- 1. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_id UUID REFERENCES public.recipes(id), -- Link to recipes (menu type)
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 4. Apply Hierarchical RLS Policies
DROP POLICY IF EXISTS "Hierarchical Access Policy" ON public.orders;
CREATE POLICY "Hierarchical Access Policy" ON public.orders 
FOR ALL TO authenticated 
USING (public.check_hierarchical_access(store_id));

DROP POLICY IF EXISTS "Hierarchical Access Policy" ON public.order_items;
CREATE POLICY "Hierarchical Access Policy" ON public.order_items 
FOR ALL TO authenticated 
USING (EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = public.order_items.order_id 
    AND public.check_hierarchical_access(o.store_id)
));
