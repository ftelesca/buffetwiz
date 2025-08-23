-- Update item table structure to match the expected schema
ALTER TABLE public.item 
ADD COLUMN IF NOT EXISTS unit_purch bigint,
ADD COLUMN IF NOT EXISTS unit_use bigint,
ADD COLUMN IF NOT EXISTS factor real DEFAULT 1;

-- Copy existing unit data to unit_purch
UPDATE public.item 
SET unit_purch = unit 
WHERE unit_purch IS NULL AND unit IS NOT NULL;

-- Make unit_purch NOT NULL after copying data
ALTER TABLE public.item 
ALTER COLUMN unit_purch SET NOT NULL;

-- Drop the old unit column
ALTER TABLE public.item 
DROP COLUMN IF EXISTS unit;