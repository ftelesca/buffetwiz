-- Disable RLS for administrative tables since no authentication is implemented
-- This allows the admin interface to function properly

ALTER TABLE public.recipe DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.item DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conv DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_menu DISABLE ROW LEVEL SECURITY;