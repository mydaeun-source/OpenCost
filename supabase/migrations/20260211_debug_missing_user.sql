-- =========================================================
-- Debug: Check existence of xmydaeun@gmail.com
-- Description: logic to find if user exists in auth vs profiles
-- =========================================================

DO $$
DECLARE
    v_user_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    -- 1. Check auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'xmydaeun@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User xmydaeun@gmail.com does NOT exist in auth.users (Signup failed completely?)';
    ELSE
        RAISE NOTICE 'User xmydaeun@gmail.com FOUND in auth.users with ID: %', v_user_id;
        
        -- 2. Check public.profiles
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) INTO v_profile_exists;
        
        IF v_profile_exists THEN
            RAISE NOTICE ' -> Profile ALSO EXISTS. (It should be visible)';
        ELSE
            RAISE NOTICE ' -> Profile matches NOT FOUND. (Trigger failed)';
            
            -- OPTIONAL REPAIR: Uncomment to fix immediately
            /*
            INSERT INTO public.profiles (id, email, full_name, role, is_approved)
            VALUES (v_user_id, 'xmydaeun@gmail.com', 'xmydaeun Demo', 'owner', FALSE);
            RAISE NOTICE ' -> REPAIRED: Profile inserted manually.';
            */
        END IF;
    END IF;
END;
$$;
