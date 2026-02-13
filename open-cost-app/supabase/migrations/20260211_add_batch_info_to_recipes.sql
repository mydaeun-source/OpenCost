-- Add batch_size and batch_unit to recipes table for variable yield support
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS batch_size numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS batch_unit text DEFAULT 'ea';

-- Comment on columns
COMMENT ON COLUMN public.recipes.batch_size IS 'The total yield amount of this recipe (e.g., 2.5)';
COMMENT ON COLUMN public.recipes.batch_unit IS 'The unit of the yield (e.g., kg, l, ea)';
