-- Add missing columns to item table if they don't exist
ALTER TABLE public.item 
ADD COLUMN IF NOT EXISTS unit_purch bigint NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_use bigint,
ADD COLUMN IF NOT EXISTS factor real DEFAULT 1;