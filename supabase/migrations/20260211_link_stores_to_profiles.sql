-- =========================================================
-- Migration: Link Stores to Profiles explicitly
-- Description: Ensures PostgREST can join profiles -> stores by owner_id
-- =========================================================

-- 1. Drop existing FK if it references auth.users (or just to be safe)
ALTER TABLE public.stores 
DROP CONSTRAINT IF EXISTS stores_owner_id_fkey;

-- 2. Add FK referencing profiles(id)
-- This allows: .from('profiles').select('*, stores(*)')
ALTER TABLE public.stores
ADD CONSTRAINT stores_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES public.profiles(id);
