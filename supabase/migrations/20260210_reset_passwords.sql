-- Migration: Reset Developer Password
-- Date: 2026-02-10
-- Resets password to '123456' for developer accounts.

-- Note: This requires pgcrypto extension (usually enabled in Supabase)
-- We use 'bf' (Blowfish) which is standard for Supabase auth.

UPDATE auth.users 
SET encrypted_password = crypt('123456', gen_salt('bf')) 
WHERE email IN ('mydaeun@gmail.com', 'xmydaeun@gmail.com');
