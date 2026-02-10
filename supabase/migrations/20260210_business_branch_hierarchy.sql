-- ==========================================
-- Migration: Business-Branch Hierarchy
-- Description: Introduces 'businesses' table as a parent for 'stores'.
-- ==========================================

-- 1. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    registration_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add business_id to Stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- 3. Migration: Create default businesses for existing stores
DO $$
DECLARE
    rec RECORD;
    new_biz_id UUID;
BEGIN
    FOR rec IN SELECT DISTINCT owner_id FROM public.stores
    LOOP
        -- Create a default business for this owner
        INSERT INTO public.businesses (owner_id, name)
        VALUES (rec.owner_id, '기본 사업장')
        RETURNING id INTO new_biz_id;

        -- Update stores for this owner to point to this business
        UPDATE public.stores SET business_id = new_biz_id WHERE owner_id = rec.owner_id AND business_id IS NULL;
    END LOOP;
END $$;

-- 4. RLS for Businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS Business Isolation" ON public.businesses;
CREATE POLICY "SaaS Business Isolation" ON public.businesses
FOR ALL TO authenticated
USING (
    owner_id = auth.uid() 
    OR public.get_auth_role() = 'super_admin'
    OR EXISTS (
        -- Staff in any of this business's stores can see the business metadata
        SELECT 1 FROM public.stores s
        JOIN public.store_staff ss ON ss.store_id = s.id
        WHERE s.business_id = public.businesses.id AND ss.user_id = auth.uid()
    )
);

-- 5. Update Hierarchical Helpers to include Business check
CREATE OR REPLACE FUNCTION public.check_hierarchical_access(t_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Super Admin
    IF (public.get_auth_role() = 'super_admin') THEN
        RETURN TRUE;
    END IF;

    -- 2. Direct Ownership or Staff entry
    RETURN EXISTS (
        SELECT 1 FROM public.stores s
        LEFT JOIN public.store_staff ss ON ss.store_id = s.id
        WHERE s.id = t_store_id 
        AND (s.owner_id = auth.uid() OR ss.user_id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Trigger to automatically link new stores to a business if not provided (safety)
CREATE OR REPLACE FUNCTION public.ensure_store_business()
RETURNS trigger AS $$
DECLARE
    default_biz_id UUID;
BEGIN
    IF NEW.business_id IS NULL THEN
        -- Find or create a default business for the owner
        SELECT id INTO default_biz_id FROM public.businesses WHERE owner_id = NEW.owner_id LIMIT 1;
        
        IF default_biz_id IS NULL THEN
            INSERT INTO public.businesses (owner_id, name)
            VALUES (NEW.owner_id, '기본 사업장')
            RETURNING id INTO default_biz_id;
        END IF;
        
        NEW.business_id := default_biz_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ensure_store_business ON public.stores;
CREATE TRIGGER tr_ensure_store_business
BEFORE INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.ensure_store_business();
