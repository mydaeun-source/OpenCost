ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
