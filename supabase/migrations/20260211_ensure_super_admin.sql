-- =========================================================
-- Migration: Ensure Super Admin Profile Exists
-- Description: Checks if the super admin user has a profile and role.
-- =========================================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Find the user ID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'mydaeun@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User mydaeun@gmail.com not found in auth.users!';
    END IF;

    -- 2. Check and Insert/Update Profile
    INSERT INTO public.profiles (id, email, full_name, role, is_approved)
    VALUES (
        v_user_id, 
        'mydaeun@gmail.com', 
        'System Operator', 
        'super_admin', 
        TRUE
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        role = 'super_admin',
        is_approved = TRUE,
        full_name = COALESCE(public.profiles.full_name, 'System Operator');

    RAISE NOTICE 'Super Admin profile secured for ID: %', v_user_id;
END;
$$;
