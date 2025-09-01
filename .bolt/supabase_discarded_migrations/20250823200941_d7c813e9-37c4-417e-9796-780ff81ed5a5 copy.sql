-- Fix field types for better precision and accuracy

-- Change cost from REAL to NUMERIC for precise monetary calculations
ALTER TABLE public.item 
ALTER COLUMN cost TYPE NUMERIC(10,2);

-- Change factor from REAL to NUMERIC for precise conversion calculations
ALTER TABLE public.item 
ALTER COLUMN factor TYPE NUMERIC(8,4);

-- Change qty from REAL to NUMERIC for precise quantity calculations
ALTER TABLE public.recipe_item 
ALTER COLUMN qty TYPE NUMERIC(10,3);

-- Change valor from INTEGER to NUMERIC for precise monetary calculations
ALTER TABLE public.event 
ALTER COLUMN valor TYPE NUMERIC(10,2);