-- SECURITY FIX: Add user ownership and implement proper RLS policies

-- Add user_id columns to tables that need user ownership
ALTER TABLE public.customer ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.event ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.recipe ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.item ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set existing records to have a default user (if any exists) or leave null for now
-- Note: In production, you'd want to assign these to actual users

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Anyone can do all to customers" ON public.customer;
DROP POLICY IF EXISTS "Anyone can view events" ON public.event;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.event;
DROP POLICY IF EXISTS "Anyone can update events" ON public.event;
DROP POLICY IF EXISTS "Anyone can delete events" ON public.event;
DROP POLICY IF EXISTS "Anyone can view recipes" ON public.recipe;
DROP POLICY IF EXISTS "Anyone can insert recipes" ON public.recipe;
DROP POLICY IF EXISTS "Anyone can update recipes" ON public.recipe;
DROP POLICY IF EXISTS "Anyone can delete recipes" ON public.recipe;
DROP POLICY IF EXISTS "Anyone can view items" ON public.item;
DROP POLICY IF EXISTS "Anyone can insert items" ON public.item;
DROP POLICY IF EXISTS "Anyone can update items" ON public.item;
DROP POLICY IF EXISTS "Anyone can delete items" ON public.item;
DROP POLICY IF EXISTS "Anyone can view recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Anyone can insert recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Anyone can update recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Anyone can delete recipe items" ON public.recipe_item;
DROP POLICY IF EXISTS "Anyone can view event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Anyone can insert event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Anyone can update event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Anyone can delete event menus" ON public.event_menu;
DROP POLICY IF EXISTS "Anyone can view units" ON public.unit;
DROP POLICY IF EXISTS "Anyone can insert units" ON public.unit;
DROP POLICY IF EXISTS "Anyone can update units" ON public.unit;
DROP POLICY IF EXISTS "Anyone can delete units" ON public.unit;

-- Create secure authentication-based policies for customer table
CREATE POLICY "Users can view their own customers" ON public.customer
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers" ON public.customer
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers" ON public.customer
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers" ON public.customer
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create secure authentication-based policies for event table
CREATE POLICY "Users can view their own events" ON public.event
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" ON public.event
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON public.event
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON public.event
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create secure authentication-based policies for recipe table
CREATE POLICY "Users can view their own recipes" ON public.recipe
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recipes" ON public.recipe
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes" ON public.recipe
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes" ON public.recipe
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create secure authentication-based policies for item table
CREATE POLICY "Users can view their own items" ON public.item
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON public.item
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON public.item
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON public.item
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- For recipe_item table, users can access items if they own the recipe
CREATE POLICY "Users can view recipe items for their recipes" ON public.recipe_item
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.recipe WHERE recipe.id = recipe_item.recipe AND recipe.user_id = auth.uid())
  );

CREATE POLICY "Users can insert recipe items for their recipes" ON public.recipe_item
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.recipe WHERE recipe.id = recipe_item.recipe AND recipe.user_id = auth.uid())
  );

CREATE POLICY "Users can update recipe items for their recipes" ON public.recipe_item
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.recipe WHERE recipe.id = recipe_item.recipe AND recipe.user_id = auth.uid())
  );

CREATE POLICY "Users can delete recipe items for their recipes" ON public.recipe_item
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.recipe WHERE recipe.id = recipe_item.recipe AND recipe.user_id = auth.uid())
  );

-- For event_menu table, users can access if they own the event
CREATE POLICY "Users can view event menus for their events" ON public.event_menu
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.event WHERE event.id = event_menu.event AND event.user_id = auth.uid())
  );

CREATE POLICY "Users can insert event menus for their events" ON public.event_menu
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.event WHERE event.id = event_menu.event AND event.user_id = auth.uid())
  );

CREATE POLICY "Users can update event menus for their events" ON public.event_menu
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.event WHERE event.id = event_menu.event AND event.user_id = auth.uid())
  );

CREATE POLICY "Users can delete event menus for their events" ON public.event_menu
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.event WHERE event.id = event_menu.event AND event.user_id = auth.uid())
  );

-- Units table can be shared among all authenticated users (global resources)
CREATE POLICY "Authenticated users can view units" ON public.unit
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage units" ON public.unit
  FOR ALL TO authenticated USING (true);

-- Fix database functions security by adding search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_event_cost(event_id bigint)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_guests smallint;
    total_cost numeric := 0;
    recipe_cost numeric;
    recipe_record RECORD;
BEGIN
    -- Validar se event_id é válido
    IF event_id IS NULL OR event_id <= 0 THEN
        RETURN 0;
    END IF;

    -- Buscar informações do evento
    SELECT numguests INTO event_guests
    FROM public.event 
    WHERE id = event_id;
    
    -- Se evento não existe ou não tem convidados, retorna 0
    IF event_guests IS NULL OR event_guests <= 0 THEN
        RETURN 0;
    END IF;
    
    -- Calcular custo de cada receita no menu do evento
    FOR recipe_record IN 
        SELECT DISTINCT em.recipe 
        FROM public.event_menu em
        WHERE em.event = event_id
        AND em.recipe IS NOT NULL
    LOOP
        -- Calcular custo individual da receita
        SELECT COALESCE(
            SUM(
                COALESCE(ri.qty, 0) * 
                CASE 
                    WHEN i.cost IS NOT NULL AND i.factor IS NOT NULL AND i.factor > 0 
                    THEN (i.cost / i.factor)
                    ELSE 0 
                END
            ), 0
        ) INTO recipe_cost
        FROM public.recipe_item ri
        LEFT JOIN public.item i ON ri.item = i.id
        WHERE ri.recipe = recipe_record.recipe
        AND ri.qty IS NOT NULL
        AND ri.qty > 0;
        
        -- Somar ao custo total (receita × número de convidados)
        total_cost := total_cost + (COALESCE(recipe_cost, 0) * event_guests);
    END LOOP;
    
    RETURN ROUND(total_cost, 2);
    
EXCEPTION WHEN OTHERS THEN
    -- Log do erro mas não falhar
    RAISE WARNING 'Erro em calculate_event_cost(%): % %', event_id, SQLSTATE, SQLERRM;
    RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_event_cost(event_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    calculated_cost numeric;
    rows_updated integer;
    event_date date;
BEGIN
    -- Validações básicas
    IF event_id IS NULL OR event_id <= 0 THEN
        RETURN false;
    END IF;
    
    -- Verificar se o evento existe e buscar a data
    SELECT date INTO event_date 
    FROM public.event 
    WHERE id = event_id;
    
    IF event_date IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verificar se a data do evento é maior que hoje
    IF event_date <= CURRENT_DATE THEN
        RETURN false;
    END IF;
    
    -- Calcular novo custo
    calculated_cost := calculate_event_cost(event_id);
    
    -- Atualizar apenas se o custo mudou
    UPDATE public.event 
    SET cost = calculated_cost
    WHERE id = event_id 
    AND (cost IS DISTINCT FROM calculated_cost);
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    RETURN rows_updated > 0;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em update_event_cost(%): % %', event_id, SQLSTATE, SQLERRM;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_all_events()
RETURNS TABLE(event_id bigint, old_cost numeric, new_cost numeric, updated boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_record RECORD;
    calculated_cost numeric;
    was_updated boolean;
BEGIN
    FOR event_record IN 
        SELECT id, cost as current_cost 
        FROM public.event 
        ORDER BY id
    LOOP
        calculated_cost := calculate_event_cost(event_record.id);
        was_updated := update_event_cost(event_record.id);
        
        RETURN QUERY SELECT 
            event_record.id,
            event_record.current_cost,
            calculated_cost,
            was_updated;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.test_triggers_health()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    result TEXT := '';
    trigger_count INTEGER;
    function_count INTEGER;
BEGIN
    -- Verificar triggers
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname IN ('item', 'recipe_item', 'event_menu', 'event')
    AND t.tgname LIKE '%cost%'
    AND NOT t.tgisinternal;
    
    -- Verificar funções
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (p.proname LIKE '%cost%' OR p.proname LIKE '%trigger%');
    
    result := format('Triggers ativos: %s | Funções criadas: %s', trigger_count, function_count);
    
    IF trigger_count >= 4 AND function_count >= 8 THEN
        result := result || ' | Status: ✅ OK';
    ELSE
        result := result || ' | Status: ⚠️ INCOMPLETO';
    END IF;
    
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_events_by_recipe(recipe_id bigint)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    events_updated integer := 0;
    event_record RECORD;
BEGIN
    -- Validações
    IF recipe_id IS NULL OR recipe_id <= 0 THEN
        RETURN 0;
    END IF;
    
    -- Atualizar todos os eventos que usam esta receita
    FOR event_record IN 
        SELECT DISTINCT em.event
        FROM public.event_menu em
        WHERE em.recipe = recipe_id
        AND em.event IS NOT NULL
    LOOP
        IF update_event_cost(event_record.event) THEN
            events_updated := events_updated + 1;
        END IF;
    END LOOP;
    
    RETURN events_updated;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro em update_events_by_recipe(%): % %', recipe_id, SQLSTATE, SQLERRM;
    RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_event_menu_cost_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    event_to_update bigint;
    success boolean := false;
BEGIN
    -- Determinar evento afetado
    IF TG_OP = 'DELETE' THEN
        event_to_update := OLD.event;
    ELSE
        event_to_update := NEW.event;
    END IF;
    
    -- Atualizar custo do evento
    success := update_event_cost(event_to_update);
    
    IF success THEN
        RAISE NOTICE 'Event_menu trigger: evento % atualizado', event_to_update;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger de event_menu: % %', SQLSTATE, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_event_numguests_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Só recalcular se o número de convidados realmente mudou
    IF OLD.numguests IS DISTINCT FROM NEW.numguests THEN
        PERFORM update_event_cost(NEW.id);
        RAISE NOTICE 'Event trigger: convidados alterados de % para % no evento %', 
                     OLD.numguests, NEW.numguests, NEW.id;
    END IF;
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger de event numguests: % %', SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_item_cost_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_recipes bigint[];
    recipe_id bigint;
    total_updated integer := 0;
BEGIN
    -- Determinar item afetado
    IF TG_OP = 'DELETE' THEN
        -- Para DELETE, usar OLD
        SELECT ARRAY(
            SELECT DISTINCT ri.recipe 
            FROM public.recipe_item ri 
            WHERE ri.item = OLD.id
        ) INTO affected_recipes;
    ELSE
        -- Para INSERT/UPDATE, usar NEW
        SELECT ARRAY(
            SELECT DISTINCT ri.recipe 
            FROM public.recipe_item ri 
            WHERE ri.item = NEW.id
        ) INTO affected_recipes;
    END IF;
    
    -- Atualizar eventos para cada receita afetada
    FOREACH recipe_id IN ARRAY affected_recipes
    LOOP
        total_updated := total_updated + update_events_by_recipe(recipe_id);
    END LOOP;
    
    -- Log apenas se houve atualizações
    IF total_updated > 0 THEN
        RAISE NOTICE 'Item trigger: % eventos atualizados', total_updated;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger de item: % %', SQLSTATE, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recipe_item_cost_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recipe_to_update bigint;
    events_updated integer := 0;
BEGIN
    -- Determinar receita afetada
    IF TG_OP = 'DELETE' THEN
        recipe_to_update := OLD.recipe;
    ELSE
        recipe_to_update := NEW.recipe;
        
        -- Para UPDATE, também verificar se mudou de receita
        IF TG_OP = 'UPDATE' AND OLD.recipe != NEW.recipe THEN
            -- Atualizar a receita antiga também
            events_updated := update_events_by_recipe(OLD.recipe);
        END IF;
    END IF;
    
    -- Atualizar eventos da receita (atual ou nova)
    events_updated := events_updated + update_events_by_recipe(recipe_to_update);
    
    IF events_updated > 0 THEN
        RAISE NOTICE 'Recipe_item trigger: % eventos atualizados', events_updated;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erro no trigger de recipe_item: % %', SQLSTATE, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;