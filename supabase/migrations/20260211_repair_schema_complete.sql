-- =========================================================
-- Migration: Complete Schema Repair & Provisioning Fix
-- Description: Ensures all required columns exist and re-applies provisioning logic.
-- =========================================================

-- 1. Ensure 'profiles' has all extended columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_business_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_registration_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_representative TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- 2. Ensure 'businesses' has extended columns
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS representative_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_category TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_type TEXT;

-- 3. Reset Trigger Function with ROBUST error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_business_id UUID;
    v_store_id UUID;
    v_full_name TEXT;
    v_business_name TEXT;
BEGIN
    v_full_name := new.raw_user_meta_data->>'full_name';
    v_business_name := COALESCE(new.raw_user_meta_data->>'requested_business_name', new.raw_user_meta_data->>'business_name', '기본 사업장');

    -- A. Create Profile (Essential)
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
        -- Attempt minimal profile creation as fallback
        BEGIN
             INSERT INTO public.profiles (id, email, full_name, role, is_approved)
             VALUES (new.id, new.email, v_full_name, 'owner', TRUE);
        EXCEPTION WHEN OTHERS THEN
             RAISE LOG 'Minimal profile creation also failed: %', SQLERRM;
        END;
    END;

    -- B. Attempt Business Creation
    BEGIN
        -- Business
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

        -- Store
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

        -- Staff Link
        INSERT INTO public.store_staff (store_id, user_id, role, permissions)
        VALUES (v_store_id, new.id, 'owner', '{"all": true}'::jsonb);

    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Provisioning failed for user %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-apply Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Restore RPC for Client-side Self-Healing
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
    if exists (select 1 from public.businesses where owner_id = p_user_id) then
        return;
    end if;

    select 
        coalesce(requested_business_name, '기본 사업장'),
        requested_registration_number,
        requested_representative,
        requested_category,
        requested_type,
        requested_address
    into 
        v_business_name,
        v_registration_number,
        v_representative,
        v_category,
        v_type,
        v_address
    from public.profiles
    where id = p_user_id;
    
    if not found then return; end if;

    insert into public.businesses (
        owner_id, name, registration_number, representative_name, business_category, business_type
    ) values (
        p_user_id, v_business_name, v_registration_number, v_representative, v_category, v_type
    ) returning id into v_business_id;

    if not exists (select 1 from public.stores where owner_id = p_user_id) then
        insert into public.stores (
            owner_id, business_id, name, business_number, address
        ) values (
            p_user_id, v_business_id, v_business_name || ' 메인점', v_registration_number, v_address
        );
    else
        update public.stores set business_id = v_business_id where owner_id = p_user_id and business_id is null;
    end if;
    
    insert into public.store_staff (store_id, user_id, role, permissions)
    select id, p_user_id, 'owner', '{"all": true}'::jsonb from public.stores where owner_id = p_user_id
    on conflict do nothing;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
