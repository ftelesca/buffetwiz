-- Make unit_use mandatory in item table
-- First set a default value for existing NULL records
UPDATE public.item 
SET unit_use = unit_purch 
WHERE unit_use IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.item 
ALTER COLUMN unit_use SET NOT NULL;