-- =========================================================
-- Migration: Final Fix for Provisioning Logic (Consolidated)
-- Description: Drops and recreates provisioning functions to ensure correct logic.
-- =========================================================

-- 1. Drop existing objects to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.ensure_business_from_profile(uuid);

-- 2. Re-create handle_new_user with ROBUST logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_business_id UUID;
    v_store_id UUID;
    v_full_name TEXT;
    v_business_name TEXT;
BEGIN
    v_full_name := new.raw_user_meta_data->>'full_name';
    -- Prioritize requested_business_name, fallback to business_name (legacy), default to '기본 사업장'
    v_business_name := COALESCE(new.raw_user_meta_data->>'requested_business_name', new.raw_user_meta_data->>'business_name', '기본 사업장');

    -- A. Create Profile (Essential - Must Succeed)
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
            v_full_name, 
            new.raw_user_meta_data->>'avatar_url', 
            'owner',
            TRUE, 
            v_business_name,
            new.raw_user_meta_data->>'requested_registration_number',
            new.raw_user_meta_data->>'requested_address',
            new.raw_user_meta_data->>'requested_representative',
            new.raw_user_meta_data->>'requested_category',
            new.raw_user_meta_data->>'requested_type'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Profile creation failed for user %: %', new.id, SQLERRM;
        -- If profile creation fails, we can't really do much else.
        RETURN new;
    END;

    -- B. Attempt Business Provisioning (Optional - Can fail safely, will be healed by RPC)
    BEGIN
        -- Create Business
        INSERT INTO public.businesses (
            owner_id, 
            name, 
            registration_number, 
            representative_name, 
            business_category, 
            business_type
        )
        VALUES (
            new.id, 
            v_business_name,
            new.raw_user_meta_data->>'requested_registration_number',
            new.raw_user_meta_data->>'requested_representative',
            new.raw_user_meta_data->>'requested_category',
            new.raw_user_meta_data->>'requested_type'
        )
        RETURNING id INTO v_business_id;

        -- Create Store (Main Branch)
        INSERT INTO public.stores (
            owner_id, 
            business_id, 
            name, 
            business_number, 
            address
        )
        VALUES (
            new.id, 
            v_business_id, 
            v_business_name || ' 메인점',
            new.raw_user_meta_data->>'requested_registration_number',
            new.raw_user_meta_data->>'requested_address'
        )
        RETURNING id INTO v_store_id;

        -- Link Owner to Staff
        INSERT INTO public.store_staff (store_id, user_id, role, permissions)
        VALUES (v_store_id, new.id, 'owner', '{"all": true}'::jsonb);
    
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Business provisioning failed for user %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-attach Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. Re-create ensure_business_from_profile (Self-Healing RPC)
CREATE OR REPLACE FUNCTION public.ensure_business_from_profile(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_business_id UUID;
    v_business_name TEXT;
    v_registration_number TEXT;
    v_representative TEXT;
    v_category TEXT;
    v_type TEXT;
    v_address TEXT;
BEGIN
    -- 1. Check if business already exists for this owner
    IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = p_user_id) THEN
        RETURN;
    END IF;

    -- 2. Fetch data from profile
    SELECT 
        COALESCE(requested_business_name, '기본 사업장'),
        requested_registration_number,
        requested_representative,
        requested_category,
        requested_type,
        requested_address
    INTO 
        v_business_name,
        v_registration_number,
        v_representative,
        v_category,
        v_type,
        v_address
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE LOG 'Profile not found for ensure_business_from_profile: %', p_user_id;
        RETURN;
    END IF;

    -- 3. Create Business
    INSERT INTO public.businesses (
        owner_id, 
        name, 
        registration_number, 
        representative_name, 
        business_category, 
        business_type
    )
    VALUES (
        p_user_id, 
        v_business_name,
        v_registration_number,
        v_representative,
        v_category,
        v_type
    )
    RETURNING id INTO v_business_id;

    -- 4. Check if any store exists, if not create one
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE owner_id = p_user_id) THEN
        INSERT INTO public.stores (
            owner_id, 
            business_id, 
            name, 
            business_number, 
            address
        )
        VALUES (
            p_user_id, 
            v_business_id, 
            v_business_name || ' 메인점',
            v_registration_number,
            v_address
        );
    ELSE
        -- Update existing stores without business_id
        UPDATE public.stores 
        SET business_id = v_business_id 
        WHERE owner_id = p_user_id AND business_id IS NULL;
    END IF;

    -- 5. Ensure Staff Link
    INSERT INTO public.store_staff (store_id, user_id, role, permissions)
    SELECT id, p_user_id, 'owner', '{"all": true}'::jsonb
    FROM public.stores
    WHERE owner_id = p_user_id
    ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
