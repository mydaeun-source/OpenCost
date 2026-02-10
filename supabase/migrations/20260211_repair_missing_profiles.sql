-- =========================================================
-- Migration: Repair Missing Profiles
-- Description: Inserts public.profiles for any auth.users that are missing them.
-- =========================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, email, raw_user_meta_data
        FROM auth.users
        WHERE id NOT IN (SELECT id FROM public.profiles)
    LOOP
        RAISE NOTICE 'Restoring missing profile for: %', r.email;
        
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
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
            r.id, 
            r.email, 
            COALESCE(r.raw_user_meta_data->>'full_name', '복구된 사용자'), 
            'owner', -- Default to owner
            FALSE,   -- Require approval again just in case
            r.raw_user_meta_data->>'business_name',
            r.raw_user_meta_data->>'requested_registration_number',
            r.raw_user_meta_data->>'requested_address',
            r.raw_user_meta_data->>'requested_representative',
            r.raw_user_meta_data->>'requested_category',
            r.raw_user_meta_data->>'requested_type'
        );
    END LOOP;
END;
$$;
