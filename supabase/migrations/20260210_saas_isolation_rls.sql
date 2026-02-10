-- ==========================================
-- Migration: SaaS Isolation RLS Hardening
-- Description: Enforces absolute data isolation between independent Owners (tenants).
-- ==========================================

-- 1. [Profiles] Tighten RLS to prevent cross-tenant discovery
-- Owners can ONLY see profiles of people linked to their stores.
DROP POLICY IF EXISTS "Profiles Access Policy" ON public.profiles;
CREATE POLICY "SaaS Profiles Isolation" ON public.profiles 
FOR SELECT TO authenticated 
USING (
    id = auth.uid() -- Can see self
    OR public.get_auth_role() = 'super_admin' -- Developer can see all
    OR EXISTS (
        -- Can see if the profile belongs to a staff member in a store I manage/own
        SELECT 1 FROM public.store_staff 
        WHERE user_id = public.profiles.id 
        AND public.check_hierarchical_access(store_id)
    )
);

-- 2. [Stores] Ensure Owners only see their own stores (unless explicitly a staff elsewhere)
-- Already covered by check_hierarchical_access, but we double-down on the stores table policy.
DROP POLICY IF EXISTS "Stores Hierarchy" ON public.stores;
CREATE POLICY "SaaS Store Isolation" ON public.stores 
FOR ALL TO authenticated 
USING (
    owner_id = auth.uid() -- Primary ownership
    OR public.get_auth_role() = 'super_admin' -- Developer control
    OR EXISTS (
        -- Staff visibility
        SELECT 1 FROM public.store_staff 
        WHERE store_id = public.stores.id AND user_id = auth.uid()
    )
);

-- 3. [Store Staff] Strict isolation for staff list
DROP POLICY IF EXISTS "Hierarchical Access Policy" ON public.store_staff;
CREATE POLICY "SaaS Staff Isolation" ON public.store_staff 
FOR ALL TO authenticated 
USING (
    user_id = auth.uid() -- Can see my own staff entries
    OR public.get_auth_role() = 'super_admin' -- Developer can see all
    OR public.is_store_owner(store_id) -- Owner can see all staff in their store
);

-- 4. [Data Tables] Re-verify all data tables use check_hierarchical_access
-- This consolidates and ensures no leakage.
DO $$ 
DECLARE
    tbl_name TEXT;
    table_list TEXT[] := ARRAY[
        'categories', 'ingredients', 'recipes', 
        'expense_categories', 'expense_records', 'sales_records', 
        'purchases'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY table_list
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Hierarchical Access Policy" ON public.%I', tbl_name);
        EXECUTE format('CREATE POLICY "SaaS Data Isolation" ON public.%I FOR ALL TO authenticated USING (public.check_hierarchical_access(store_id))', tbl_name);
    END LOOP;
END $$;

-- 5. [Security Helper Expansion]
-- Prevent Owners from accidentally seeing each other in any global list.
CREATE OR REPLACE FUNCTION public.get_visible_users()
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT id FROM public.profiles
    WHERE id = auth.uid()
    OR public.get_auth_role() = 'super_admin'
    OR id IN (
        SELECT user_id FROM public.store_staff
        WHERE store_id IN (
            SELECT id FROM public.stores WHERE owner_id = auth.uid()
            OR id IN (SELECT store_id FROM public.store_staff WHERE user_id = auth.uid())
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
