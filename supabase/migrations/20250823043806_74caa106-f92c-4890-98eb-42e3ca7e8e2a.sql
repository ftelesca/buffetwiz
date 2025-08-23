-- Add title and description fields to the event table
ALTER TABLE public.event 
ADD COLUMN title character varying NOT NULL DEFAULT 'Evento sem título',
ADD COLUMN description text;