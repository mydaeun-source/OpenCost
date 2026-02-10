-- Migration: Fix Developer Super User Account
-- Date: 2026-02-10
-- Corrects email and ensures super_admin role and is_approved = true

-- 1. Correct existing profile if it was registered with the typo
UPDATE public.profiles 
SET email = 'mydaeun@gmail.com'
WHERE email = 'xmydaeun@gmail.com';

-- 2. Ensure the correct email has super_admin role and is approved
UPDATE public.profiles
SET role = 'super_admin', is_approved = TRUE
WHERE email = 'mydaeun@gmail.com';
