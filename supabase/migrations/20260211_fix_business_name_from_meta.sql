-- =========================================================
-- Fix: Force Update Business Name from Metadata
-- Description: Reads business_name from auth.users and updates profiles/businesses/stores
-- =========================================================

DO $$
DECLARE
    v_email TEXT := 'xmydaeun@gmail.com';
    v_user_id UUID;
    v_meta_biz_name TEXT;
    v_current_biz_name TEXT;
BEGIN
    -- 1. Get User and Metadata
    SELECT id, raw_user_meta_data->>'business_name', raw_user_meta_data->>'requested_business_name'
    INTO v_user_id, v_meta_biz_name, v_current_biz_name
    FROM auth.users
    WHERE email = v_email;

    -- Fallback to the other key if one is null
    IF v_meta_biz_name IS NULL THEN
        v_meta_biz_name := v_current_biz_name;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User % not found!', v_email;
        RETURN;
    END IF;

    IF v_meta_biz_name IS NULL OR v_meta_biz_name = '' THEN
        RAISE NOTICE 'No business name found in metadata for %. Checking profile...', v_email;
        -- Optional: Check profile just in case
        SELECT requested_business_name INTO v_meta_biz_name FROM public.profiles WHERE id = v_user_id;
    END IF;

    IF v_meta_biz_name IS NULL OR v_meta_biz_name = '' THEN
        RAISE NOTICE 'Still no business name found. Skipping.';
        RETURN;
    END IF;

    RAISE NOTICE 'Restoring Business Name: %', v_meta_biz_name;

    -- 2. Update Profile
    UPDATE public.profiles
    SET requested_business_name = v_meta_biz_name
    WHERE id = v_user_id;

    -- 3. Update Business
    -- Assuming 1:1 relation for now
    UPDATE public.businesses
    SET name = v_meta_biz_name
    WHERE owner_id = v_user_id;

    -- 4. Update Store (Main Store)
    UPDATE public.stores
    SET name = v_meta_biz_name || ' 메인점'
    WHERE owner_id = v_user_id AND name LIKE '%기본 사업장%';

    -- If the store name was something else, force update it anyway if it's the only one
    IF (SELECT COUNT(*) FROM public.stores WHERE owner_id = v_user_id) = 1 THEN
         UPDATE public.stores
         SET name = v_meta_biz_name || ' 메인점'
         WHERE owner_id = v_user_id;
    END IF;
    
    RAISE NOTICE 'Done. Profile/Business/Store names synced to: %', v_meta_biz_name;
END;
$$;
