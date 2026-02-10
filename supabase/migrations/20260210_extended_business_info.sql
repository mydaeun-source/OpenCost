-- ==========================================
-- Migration: Extended Business Info Collection
-- Description: Adds detailed business fields and updates the auto-provisioning logic.
-- ==========================================

-- 1. Extend Businesses table to store representative and industry info
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_category TEXT; -- 업종
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_type TEXT;     -- 업태

-- 2. Extend Profiles to capture requested details during signup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_registration_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_representative TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_type TEXT;

-- 3. Update handle_new_user trigger to capture all detailed metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    avatar_url, 
    role, 
    is_approved,
    requested_business_name,
    requested_registration_number,
    requested_address,
    requested_representative,
    requested_category,
    requested_type
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    'owner',
    FALSE,
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'registration_number',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'representative',
    new.raw_user_meta_data->>'category',
    new.raw_user_meta_data->>'type'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Advanced provisioning with all detailed information
CREATE OR REPLACE FUNCTION public.approve_owner_and_create_store(t_owner_id UUID)
RETURNS VOID AS $$
DECLARE
    v_profile RECORD;
    v_business_id UUID;
    v_store_id UUID;
BEGIN
    -- 1. Get all requested info
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = t_owner_id AND is_approved = FALSE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found or already approved.';
    END IF;

    -- 2. Update Profile to Approved
    UPDATE public.profiles
    SET is_approved = TRUE, updated_at = now()
    WHERE id = t_owner_id;

    -- 3. Create Business with full metadata
    INSERT INTO public.businesses (
        owner_id, 
        name, 
        registration_number, 
        representative_name, 
        business_category, 
        business_type
    )
    VALUES (
        t_owner_id, 
        COALESCE(v_profile.requested_business_name, '기본 사업장'),
        v_profile.requested_registration_number,
        v_profile.requested_representative,
        v_profile.requested_category,
        v_profile.requested_type
    )
    RETURNING id INTO v_business_id;

    -- 4. Create Store (Main Branch) with address
    INSERT INTO public.stores (
        owner_id, 
        business_id, 
        name, 
        business_number, 
        address
    )
    VALUES (
        t_owner_id, 
        v_business_id, 
        COALESCE(v_profile.requested_business_name, '기본 사업장') || ' 메인점',
        v_profile.requested_registration_number,
        v_profile.requested_address
    )
    RETURNING id INTO v_store_id;

    -- 5. Link Owner to Staff
    INSERT INTO public.store_staff (store_id, user_id, role, permissions)
    VALUES (v_store_id, t_owner_id, 'owner', '{"all": true}'::jsonb)
    ON CONFLICT (store_id, user_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
