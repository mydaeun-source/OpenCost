-- ==========================================
-- Migration: Business Data Sync from Profile
-- Description: Ensures a business exists for an owner based on their profile metadata.
-- ==========================================

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
    -- 1. Check if business already exists
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

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
