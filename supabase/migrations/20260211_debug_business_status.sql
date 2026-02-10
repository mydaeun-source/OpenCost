-- =========================================================
-- Debug: Check Business Status for xmydaeun@gmail.com
-- =========================================================

DO $$
DECLARE
    v_user_id UUID;
    v_result TEXT := '';
    r RECORD;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'xmydaeun@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found in auth.users';
        RETURN;
    END IF;

    -- 1. Check Profile
    FOR r IN SELECT * FROM public.profiles WHERE id = v_user_id LOOP
        RAISE NOTICE 'Profile Found: Approved=%, Role=%', r.is_approved, r.role;
    END LOOP;

    -- 2. Check Business
    IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = v_user_id) THEN
        RAISE NOTICE 'Business FOUND.';
        FOR r IN SELECT * FROM public.businesses WHERE owner_id = v_user_id LOOP
             RAISE NOTICE ' - Business: % (ID: %)', r.name, r.id;
        END LOOP;
    ELSE
        RAISE NOTICE 'Business NOT FOUND.';
    END IF;

    -- 3. Check Store
    IF EXISTS (SELECT 1 FROM public.stores WHERE owner_id = v_user_id) THEN
        RAISE NOTICE 'Store FOUND.';
        FOR r IN SELECT * FROM public.stores WHERE owner_id = v_user_id LOOP
             RAISE NOTICE ' - Store: % (BizID: %)', r.name, r.business_id;
        END LOOP;
    ELSE
        RAISE NOTICE 'Store NOT FOUND.';
    END IF;
    
    -- 4. Attempt to self-heal via existing RPC if missing
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = v_user_id) THEN
        RAISE NOTICE 'Attempting to run ensure_business_from_profile...';
        PERFORM public.ensure_business_from_profile(v_user_id);
        
        -- Check again
        IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = v_user_id) THEN
            RAISE NOTICE ' -> REPAIRED: Business created successfully via RPC.';
        ELSE
            RAISE NOTICE ' -> REPAIR FAILED: RPC ran but no business created.';
        END IF;
    END IF;
END;
$$;
