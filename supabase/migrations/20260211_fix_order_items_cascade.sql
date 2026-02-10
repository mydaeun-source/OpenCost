-- =========================================================
-- Migration: Add ON DELETE CASCADE to Order Items
-- Description: Allows deleting recipes/menus even if they are referenced in order_items
-- =========================================================

-- 1. Drop existing FK for menu_id
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_menu_id_fkey;

-- 2. Recreate with ON DELETE CASCADE
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_menu_id_fkey
FOREIGN KEY (menu_id) REFERENCES public.recipes(id)
ON DELETE CASCADE;

-- 3. Also ensure order_id is cascade (just in case)
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;
