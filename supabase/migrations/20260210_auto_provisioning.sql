-- ==========================================
-- Migration: Auto-Provisioning System
-- Description: Adds requested_business_name to profiles and RPC for approval + creation.
-- ==========================================

-- 1. Add requested_business_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_business_name TEXT;

-- 2. Update handle_new_user trigger to capture business name from metadata
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
    requested_business_name
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    'owner',
    FALSE,
    new.raw_user_meta_data->>'business_name' -- Captured from signup form
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Approve owner and atomically create business/store
CREATE OR REPLACE FUNCTION public.approve_owner_and_create_store(t_owner_id UUID)
RETURNS VOID AS $$
DECLARE
    v_business_name TEXT;
    v_business_id UUID;
    v_store_id UUID;
BEGIN
    -- 1. Get requested business name and verify eligibility
    SELECT requested_business_name INTO v_business_name
    FROM public.profiles
    WHERE id = t_owner_id AND is_approved = FALSE AND role = 'owner';

    IF v_business_name IS NULL THEN
        v_business_name := '기본 사업장';
    END IF;

    -- 2. Update Profile to Approved
    UPDATE public.profiles
    SET is_approved = TRUE, updated_at = now()
    WHERE id = t_owner_id;

    -- 3. Create Business
    INSERT INTO public.businesses (owner_id, name)
    VALUES (t_owner_id, v_business_name)
    RETURNING id INTO v_business_id;

    -- 4. Create Store (Main Branch)
    INSERT INTO public.stores (owner_id, business_id, name)
    VALUES (t_owner_id, v_business_id, v_business_name || ' 메인점')
    RETURNING id INTO v_store_id;

    -- 5. Link Owner to Staff (already handled by triggers in some versions, but let's be explicit)
    -- tr_ensure_store_business handle business_id link, but we also want store_staff entry.
    INSERT INTO public.store_staff (store_id, user_id, role, permissions)
    VALUES (v_store_id, t_owner_id, 'owner', '{"all": true}'::jsonb)
    ON CONFLICT (store_id, user_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
