-- ==========================================
-- Migration: Repair Provision Demo User
-- Description: Ensures pgcrypto extension and re-defines provision_demo_user with grants.
-- ==========================================

-- 1. Ensure extension for crypt/gen_salt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Re-define the function (Explicitly ensuring argument order and types)
CREATE OR REPLACE FUNCTION public.provision_demo_user(
    demo_email TEXT,
    demo_password TEXT,
    demo_full_name TEXT
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Security Check
    IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'super_admin' THEN
        RAISE EXCEPTION 'Access Denied: Only super_admin can provision demo users.';
    END IF;

    -- 1. Check if user already exists
    SELECT id INTO new_user_id FROM auth.users WHERE email = demo_email;

    IF new_user_id IS NULL THEN
        -- 2. Create user in auth.users
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            demo_email,
            extensions.crypt(demo_password, extensions.gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', demo_full_name, 'avatar_url', ''),
            now(),
            now(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO new_user_id;
    END IF;

    -- 3. Sync profile
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (new_user_id, demo_email, demo_full_name, 'owner')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = 'owner';

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 3. EXPLICIT GRANTS (CRITICAL for PostgREST visibility)
GRANT EXECUTE ON FUNCTION public.provision_demo_user(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provision_demo_user(TEXT, TEXT, TEXT) TO service_role;
