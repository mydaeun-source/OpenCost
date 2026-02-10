-- =========================================================
-- Migration: Fix Infinite Recursion in RLS Policies
-- Description: Breaks circular dependencies using SECURITY DEFINER functions.
-- =========================================================

-- 1. Ensure get_auth_role is SECURITY DEFINER to avoid profile RLS recursion
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Try to get from JWT first (if synced) to save DB call, or just go straight to DB
    -- For safety while profiles is the source of truth, read from DB with SECURITY DEFINER
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Bypasses RLS on profiles

-- 2. Create a safe store owner check to avoid store RLS recursion from store_staff
CREATE OR REPLACE FUNCTION public.is_store_owner_safe(t_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.stores 
        WHERE id = t_store_id 
        AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Bypasses RLS on stores

-- 3. Profiles Policy (Refined)
DROP POLICY IF EXISTS "SaaS Profiles Hierarchy" ON public.profiles;
CREATE POLICY "SaaS Profiles Hierarchy" ON public.profiles 
FOR SELECT TO authenticated 
USING (
    id = auth.uid() 
    OR public.get_auth_role() = 'super_admin'
    OR EXISTS (
        -- Can see people who are in the same store as they are
        -- This query reads store_staff. store_staff policy must NOT read profiles recursively.
        SELECT 1 FROM public.store_staff ss_target
        WHERE ss_target.user_id = public.profiles.id
        AND EXISTS (
            SELECT 1 FROM public.store_staff ss_me
            WHERE ss_me.user_id = auth.uid()
            AND ss_me.store_id = ss_target.store_id
        )
    )
);

-- 4. Stores Policy (Refined)
DROP POLICY IF EXISTS "SaaS Store Isolation" ON public.stores;
CREATE POLICY "SaaS Store Isolation" ON public.stores
FOR ALL TO authenticated
USING (
    owner_id = auth.uid() 
    OR public.get_auth_role() = 'super_admin'
    OR EXISTS (
        -- Staff can see their store
        SELECT 1 FROM public.store_staff ss 
        WHERE ss.store_id = public.stores.id 
        AND ss.user_id = auth.uid()
    )
);

-- 5. Store Staff Policy (The Recursion Breaker)
DROP POLICY IF EXISTS "SaaS Staff Hierarchy" ON public.store_staff;
CREATE POLICY "SaaS Staff Hierarchy" ON public.store_staff 
FOR ALL TO authenticated 
USING (
    user_id = auth.uid() 
    OR public.get_auth_role() = 'super_admin'
    -- CRITICAL CHANGE: Use function instead of direct subquery to stores
    OR public.is_store_owner_safe(store_id)
);

-- 6. Businesses Policy
DROP POLICY IF EXISTS "SaaS Business Isolation" ON public.businesses;
CREATE POLICY "SaaS Business Isolation" ON public.businesses
FOR ALL TO authenticated
USING (
    owner_id = auth.uid() 
    OR public.get_auth_role() = 'super_admin'
    OR EXISTS (
        SELECT 1 FROM public.stores s
        JOIN public.store_staff ss ON ss.store_id = s.id
        WHERE s.business_id = public.businesses.id AND ss.user_id = auth.uid()
    )
);
