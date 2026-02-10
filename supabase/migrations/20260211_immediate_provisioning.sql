-- ==========================================
-- Migration: Immediate Auto-Provisioning
-- Description: New signups are approved by default and provisioned instantly.
-- ==========================================

-- 1. Update handle_new_user trigger to set is_approved = TRUE and provision
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

    -- B. Attempt Business Provisioning (Optional/Can Fail safely)
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
        -- Log error but allow Profile creation (Step A) to persist
        RAISE LOG 'Business provisioning failed for user %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
