-- ==========================================
-- Migration: Final SaaS RBAC Consolidation
-- Description: Corrects restrictive policies on profiles and stabilizes store_staff joins.
-- ==========================================

-- 1. [Profiles] Correct the restrictive policy from full_schema_init.sql
-- Allow users to see their own profiles AND profiles of people in the same store hierarchy.
DROP POLICY IF EXISTS "Profiles Access Policy" ON public.profiles;
DROP POLICY IF EXISTS "SaaS Profiles Isolation" ON public.profiles;

CREATE POLICY "SaaS Profiles Hierarchy" ON public.profiles 
FOR SELECT TO authenticated 
USING (
    id = auth.uid() 
    OR public.get_auth_role() = 'super_admin'
    OR EXISTS (
        -- Can see people who are in the same store as they are
        SELECT 1 FROM public.store_staff ss_target
        WHERE ss_target.user_id = public.profiles.id
        AND EXISTS (
            SELECT 1 FROM public.store_staff ss_me
            WHERE ss_me.user_id = auth.uid()
            AND ss_me.store_id = ss_target.store_id
        )
    )
);

-- 2. [Store Staff] Update foreign key to profiles for better joins
-- First, drop the old FK if it exists (referencing auth.users)
ALTER TABLE public.store_staff DROP CONSTRAINT IF EXISTS store_staff_user_id_fkey;

-- Add new FK referencing public.profiles
ALTER TABLE public.store_staff 
ADD CONSTRAINT store_staff_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 3. [Store Staff] Ensure RLS allows owners to see their staff
DROP POLICY IF EXISTS "Hierarchical Access Policy" ON public.store_staff;
DROP POLICY IF EXISTS "SaaS Staff Isolation" ON public.store_staff;

CREATE POLICY "SaaS Staff Hierarchy" ON public.store_staff 
FOR ALL TO authenticated 
USING (
    user_id = auth.uid() -- self
    OR public.get_auth_role() = 'super_admin' -- dev
    OR public.is_store_owner(store_id) -- store owner
);

-- 4. [Search Path Security]
-- Ensure helper functions are robust
CREATE OR REPLACE FUNCTION public.check_hierarchical_access(t_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF (public.get_auth_role() = 'super_admin') THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.store_staff 
        WHERE store_id = t_store_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
