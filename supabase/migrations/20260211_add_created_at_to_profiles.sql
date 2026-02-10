-- =========================================================
-- Migration: Add created_at to Profiles for Admin Page Sorting
-- Description: Adds missing created_at column to support dashboard sorting.
-- =========================================================

-- 1. Add column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
