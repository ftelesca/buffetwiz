-- Atualizar políticas RLS para permitir acesso público em todas as tabelas

-- Tabela recipe
DROP POLICY IF EXISTS "Authenticated users can view recipes" ON public.recipe;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipe;
DROP POLICY IF EXISTS "Authenticated users can update recipes" ON public.recipe;
DROP POLICY IF EXISTS "Authenticated users can delete recipes" ON public.recipe;

CREATE POLICY "Anyone can view recipes" ON public.recipe FOR SELECT USING (true);
CREATE POLICY "Anyone can insert recipes" ON public.recipe FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update recipes" ON public.recipe FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete recipes" ON public.recipe FOR DELETE USING (true);

-- Tabela event
DROP POLICY IF EXISTS "Authenticated users can view events" ON public.event;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.event;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.event;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.event;

CREATE POLICY "Anyone can view events" ON public.event FOR SELECT USING (true);
CREATE POLICY "Anyone can insert events" ON public.event FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update events" ON public.event FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete events" ON public.event FOR DELETE USING (true);

-- Tabela item
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.item;
DROP POLICY IF EXISTS "Authenticated users can insert items" ON public.item;
DROP POLICY IF EXISTS "Authenticated users can update items" ON public.item;
DROP POLICY IF EXISTS "Authenticated users can delete items" ON public.item;

CREATE POLICY "Anyone can view items" ON public.item FOR SELECT USING (true);
CREATE POLICY "Anyone can insert items" ON public.item FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update items" ON public.item FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete items" ON public.item FOR DELETE USING (true);

-- Tabela unit
DROP POLICY IF EXISTS "Authenticated users can view units" ON public.unit;
DROP POLICY IF EXISTS "Authenticated users can insert units" ON public.unit;
DROP POLICY IF EXISTS "Authenticated users can update units" ON public.unit;
DROP POLICY IF EXISTS "Authenticated users can delete units" ON public.unit;

CREATE POLICY "Anyone can view units" ON public.unit FOR SELECT USING (true);
CREATE POLICY "Anyone can insert units" ON public.unit FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update units" ON public.unit FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete units" ON public.unit FOR DELETE USING (true);

-- Demais tabelas relacionadas
DROP POLICY IF EXISTS "Authenticated users can view recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Authenticated users can insert recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Authenticated users can update recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Authenticated users can delete recipe items" ON public.recipe_item;

CREATE POLICY "Anyone can view recipe items" ON public.recipe_item FOR SELECT USING (true);
CREATE POLICY "Anyone can insert recipe items" ON public.recipe_item FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update recipe items" ON public.recipe_item FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete recipe items" ON public.recipe_item FOR DELETE USING (true);

DROP POLICY IF EXISTS "Authenticated users can view event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Authenticated users can insert event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Authenticated users can update event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Authenticated users can delete event menus" ON public.event_menu;

CREATE POLICY "Anyone can view event menus" ON public.event_menu FOR SELECT USING (true);
CREATE POLICY "Anyone can insert event menus" ON public.event_menu FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update event menus" ON public.event_menu FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete event menus" ON public.event_menu FOR DELETE USING (true);

DROP POLICY IF EXISTS "Authenticated users can view unit conversions" ON public.unit_conv;
DROP POLICY IF EXISTS "Authenticated users can insert unit conversions" ON public.unit_conv;
DROP POLICY IF EXISTS "Authenticated users can update unit conversions" ON public.unit_conv;
DROP POLICY IF EXISTS "Authenticated users can delete unit conversions" ON public.unit_conv;

CREATE POLICY "Anyone can view unit conversions" ON public.unit_conv FOR SELECT USING (true);
CREATE POLICY "Anyone can insert unit conversions" ON public.unit_conv FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update unit conversions" ON public.unit_conv FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete unit conversions" ON public.unit_conv FOR DELETE USING (true);