-- ==========================================
-- Migration: Add Approval System to Profiles
-- Description: Adds is_approved column and updates trigger for registration flow.
-- ==========================================

-- 1. Add is_approved column to profiles (Default false for security)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 2. Update existing accounts: Set Super Admin and existing accounts to approved
UPDATE public.profiles 
SET is_approved = TRUE, role = 'super_admin'
WHERE email = 'mydaeun@gmail.com';

-- For others who were already using the system, we approve them to avoid breaking changes for existing users
UPDATE public.profiles 
SET is_approved = TRUE 
WHERE is_approved IS FALSE AND role IN ('owner', 'manager', 'staff');

-- 3. Update handle_new_user trigger to set is_approved = FALSE by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_approved)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url', 
    'owner',
    FALSE -- New signups are NOT approved by default
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
