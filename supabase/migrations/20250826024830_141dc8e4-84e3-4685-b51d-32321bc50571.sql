-- Add price column to event table
ALTER TABLE public.event 
ADD COLUMN price NUMERIC;