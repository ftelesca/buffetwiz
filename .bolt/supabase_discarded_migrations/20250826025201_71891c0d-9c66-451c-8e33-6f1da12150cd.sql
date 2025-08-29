-- Rename column valor to cost in event table
ALTER TABLE public.event 
RENAME COLUMN valor TO cost;