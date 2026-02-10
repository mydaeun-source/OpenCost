-- =========================================================
-- Migration: Final Fix for Admin RLS (Comprehensive)
-- Description: Explicitly allows super_admin to view ALL tables without restriction.
-- =========================================================

-- 1. Profiles: allow super_admin to see EVERYTHING
DROP POLICY IF EXISTS "SaaS Profiles Hierarchy" ON public.profiles;
CREATE POLICY "SaaS Profiles Hierarchy" ON public.profiles 
FOR SELECT TO authenticated 
USING (
    id = auth.uid() 
    OR (SELECT public.get_auth_role()) = 'super_admin'
    OR EXISTS (
        SELECT 1 FROM public.store_staff ss_target
        WHERE ss_target.user_id = public.profiles.id
        AND EXISTS (
            SELECT 1 FROM public.store_staff ss_me
            WHERE ss_me.user_id = auth.uid()
            AND ss_me.store_id = ss_target.store_id
        )
    )
);

-- 2. Businesses: allow super_admin to see EVERYTHING
DROP POLICY IF EXISTS "SaaS Business Isolation" ON public.businesses;
CREATE POLICY "SaaS Business Isolation" ON public.businesses
FOR ALL TO authenticated
USING (
    owner_id = auth.uid() 
    OR (SELECT public.get_auth_role()) = 'super_admin'
    OR EXISTS (
        SELECT 1 FROM public.stores s
        JOIN public.store_staff ss ON ss.store_id = s.id
        WHERE s.business_id = public.businesses.id AND ss.user_id = auth.uid()
    )
);

-- 3. Stores: allow super_admin to see EVERYTHING
DROP POLICY IF EXISTS "SaaS Store Isolation" ON public.stores;
CREATE POLICY "SaaS Store Isolation" ON public.stores
FOR ALL TO authenticated
USING (
    owner_id = auth.uid() 
    OR (SELECT public.get_auth_role()) = 'super_admin'
    OR EXISTS (
        SELECT 1 FROM public.store_staff ss 
        WHERE ss.store_id = public.stores.id 
        AND ss.user_id = auth.uid()
    )
);

-- 4. Store Staff: allow super_admin to see EVERYTHING
DROP POLICY IF EXISTS "SaaS Staff Hierarchy" ON public.store_staff;
CREATE POLICY "SaaS Staff Hierarchy" ON public.store_staff 
FOR ALL TO authenticated 
USING (
    user_id = auth.uid() 
    OR (SELECT public.get_auth_role()) = 'super_admin'
    OR  EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = public.store_staff.store_id
        AND s.owner_id = auth.uid()
    )
);
