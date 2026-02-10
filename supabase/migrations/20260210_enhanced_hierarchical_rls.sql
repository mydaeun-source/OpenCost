-- ==========================================
-- Migration: Enhanced Hierarchical RLS
-- Description: Updates RLS logic to include explicit owner_id checks from the stores table.
-- ==========================================

-- 1. Update is_store_owner to check BOTH store_staff and stores.owner_id
CREATE OR REPLACE FUNCTION public.is_store_owner(t_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if they are the designated owner in the stores table
  IF EXISTS (SELECT 1 FROM public.stores WHERE id = t_store_id AND owner_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;

  -- Fallback to store_staff entry with 'owner' role
  RETURN EXISTS (
    SELECT 1 FROM public.store_staff 
    WHERE store_id = t_store_id AND user_id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update check_hierarchical_access to include owner_id check
CREATE OR REPLACE FUNCTION public.check_hierarchical_access(t_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super Admin check
    IF (public.get_auth_role() = 'super_admin') THEN
        RETURN TRUE;
    END IF;

    -- Owner check (Direct via stores table)
    IF EXISTS (SELECT 1 FROM public.stores WHERE id = t_store_id AND owner_id = auth.uid()) THEN
        RETURN TRUE;
    END IF;

    -- Standard staff check (via store_staff)
    RETURN EXISTS (
        SELECT 1 FROM public.store_staff 
        WHERE store_id = t_store_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Ensure INSERT policy for stores allows 'owner' and 'super_admin' roles
-- We need to drop and recreate the policy for stores to be certain.
DROP POLICY IF EXISTS "Stores Hierarchy" ON public.stores;
CREATE POLICY "Stores Hierarchy" ON public.stores 
FOR ALL TO authenticated 
USING (
    public.check_hierarchical_access(id)
)
WITH CHECK (
    -- Allow insertion if the user is an owner or super_admin
    (public.get_auth_role() IN ('owner', 'super_admin'))
);
