-- ==========================================
-- Function: provision_demo_user
-- Description: Creates a demo user in auth.users and public.profiles.
-- Strictly for administrative use/seeding by Super Admins.
-- ==========================================

CREATE OR REPLACE FUNCTION public.provision_demo_user(
    demo_email TEXT,
    demo_password TEXT,
    demo_full_name TEXT
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Only allow super_admin to perform this operation (Safety Guard)
    IF NOT public.get_auth_role() = 'super_admin' THEN
        RAISE EXCEPTION 'Access Denied: Only super_admin can provision demo users.';
    END IF;

    -- 1. Check if user already exists in auth.users
    SELECT id INTO new_user_id FROM auth.users WHERE email = demo_email;

    IF new_user_id IS NULL THEN
        -- 2. Create user in auth.users
        -- password is encrypted via crypt by supabase automatically if handled correctly,
        -- but here we use the raw table insertion for seeding purposes.
        -- Note: For real world, using Supabase Auth Admin API via Edge Functions is better,
        -- but for this direct DB injection seeding logic:
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
            crypt(demo_password, gen_salt('bf')),
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

    -- 3. Profile should be created by trigger (on_auth_user_created),
    -- but we ensure it exists and has the correct role.
    -- The trigger handles inserting into public.profiles as 'owner' by default.
    -- If it already existed, we just ensure it's 'owner'.
    UPDATE public.profiles
    SET role = 'owner', full_name = demo_full_name
    WHERE id = new_user_id;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
