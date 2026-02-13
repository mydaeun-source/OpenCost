-- Add portion_size and portion_unit to recipes table for portion management support
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS portion_size numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS portion_unit text DEFAULT NULL;

-- Comment on columns
COMMENT ON COLUMN public.recipes.portion_size IS 'The size of one portion in batch units (e.g., 0.2 if batch unit is kg and portion is 200g)';
COMMENT ON COLUMN public.recipes.portion_unit IS 'The unit of the portion (e.g., bag, pck)';
