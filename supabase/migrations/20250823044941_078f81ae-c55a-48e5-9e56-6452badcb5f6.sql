-- Enable Row Level Security on all tables
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_conv ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to access all data
-- Customer policies
CREATE POLICY "Authenticated users can view customers" ON public.customer
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON public.customer
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON public.customer
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete customers" ON public.customer
  FOR DELETE TO authenticated USING (true);

-- Event policies
CREATE POLICY "Authenticated users can view events" ON public.event
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert events" ON public.event
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update events" ON public.event
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete events" ON public.event
  FOR DELETE TO authenticated USING (true);

-- Event menu policies
CREATE POLICY "Authenticated users can view event menus" ON public.event_menu
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert event menus" ON public.event_menu
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update event menus" ON public.event_menu
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete event menus" ON public.event_menu
  FOR DELETE TO authenticated USING (true);

-- Item policies
CREATE POLICY "Authenticated users can view items" ON public.item
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert items" ON public.item
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update items" ON public.item
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete items" ON public.item
  FOR DELETE TO authenticated USING (true);

-- Recipe policies
CREATE POLICY "Authenticated users can view recipes" ON public.recipe
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recipes" ON public.recipe
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recipes" ON public.recipe
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recipes" ON public.recipe
  FOR DELETE TO authenticated USING (true);

-- Recipe item policies
CREATE POLICY "Authenticated users can view recipe items" ON public.recipe_item
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert recipe items" ON public.recipe_item
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recipe items" ON public.recipe_item
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recipe items" ON public.recipe_item
  FOR DELETE TO authenticated USING (true);

-- Unit policies (reference data - allow all authenticated users)
CREATE POLICY "Authenticated users can view units" ON public.unit
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert units" ON public.unit
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update units" ON public.unit
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete units" ON public.unit
  FOR DELETE TO authenticated USING (true);

-- Unit conversion policies (reference data - allow all authenticated users)
CREATE POLICY "Authenticated users can view unit conversions" ON public.unit_conv
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert unit conversions" ON public.unit_conv
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update unit conversions" ON public.unit_conv
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete unit conversions" ON public.unit_conv
  FOR DELETE TO authenticated USING (true);