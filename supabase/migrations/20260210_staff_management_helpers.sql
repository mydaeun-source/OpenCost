-- ==========================================
-- Function: add_staff_by_email
-- Description: Adds a user to store_staff by their email address.
-- Strictly for use by Owners or Super Admins.
-- ==========================================

CREATE OR REPLACE FUNCTION public.add_staff_by_email(
    t_store_id UUID,
    t_email TEXT,
    t_role TEXT -- 'manager' or 'staff'
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    target_full_name TEXT;
    result JSONB;
BEGIN
    -- 1. Authorization Check: Is the caller allowed to manage this store?
    IF NOT public.check_hierarchical_access(t_store_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to manage staff for this store.';
    END IF;

    -- 2. Find the user by email in the public.profiles table
    SELECT id, full_name INTO target_user_id, target_full_name 
    FROM public.profiles 
    WHERE email = LOWER(t_email);

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: No user registered with email %', t_email;
    END IF;

    -- 3. Check if they are already on the staff
    IF EXISTS (SELECT 1 FROM public.store_staff WHERE store_id = t_store_id AND user_id = target_user_id) THEN
        RAISE EXCEPTION 'User is already a staff member of this store.';
    END IF;

    -- 4. Insert into store_staff
    INSERT INTO public.store_staff (store_id, user_id, role, permissions)
    VALUES (
        t_store_id, 
        target_user_id, 
        t_role, 
        jsonb_build_object('all', (t_role = 'manager'))
    );

    -- 5. Prepare return data
    result := jsonb_build_object(
        'user_id', target_user_id,
        'full_name', target_full_name,
        'email', t_email,
        'role', t_role,
        'status', 'success'
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
