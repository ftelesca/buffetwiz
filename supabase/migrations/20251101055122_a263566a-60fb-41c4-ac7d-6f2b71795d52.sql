-- Update calculate_event_cost to accept uuid instead of bigint
CREATE OR REPLACE FUNCTION public.calculate_event_cost(event_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    total_cost numeric := 0;
    current_cost numeric;
    new_cost numeric;
BEGIN
    -- First get the current cost value from the event table
    SELECT cost INTO current_cost
    FROM public.event
    WHERE id = event_id_param;
    
    -- Calculate the total cost based on all recipes in this event
    SELECT COALESCE(SUM(em.qty * public.calculate_recipe_unit_cost(em.recipe)), 0)
    INTO new_cost
    FROM public.event_menu em
    JOIN public.recipe r ON em.recipe = r.id
    WHERE em.event = event_id_param;
    
    -- Update the event.cost column if the cost has changed
    IF new_cost IS DISTINCT FROM current_cost THEN
        UPDATE public.event
        SET cost = new_cost
        WHERE id = event_id_param;
    END IF;
  
    RETURN new_cost;
END;
$function$;

-- Update calculate_recipe_base_cost to accept uuid instead of bigint
CREATE OR REPLACE FUNCTION public.calculate_recipe_base_cost(recipe_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    base_cost numeric := 0;
BEGIN
    SELECT COALESCE(SUM((ri.qty * i.cost) / i.factor), 0)
    INTO base_cost
    FROM public.recipe_item ri
    JOIN public.item i ON ri.item = i.id
    WHERE ri.recipe = recipe_id_param;

    RETURN base_cost;
END;
$function$;

-- Update calculate_recipe_unit_cost to accept uuid instead of bigint
CREATE OR REPLACE FUNCTION public.calculate_recipe_unit_cost(recipe_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    base_cost numeric := 0;
    recipe_efficiency numeric := 1.00;
    unit_cost numeric := 0;
BEGIN
    -- Get base cost using the new function
    SELECT public.calculate_recipe_base_cost(recipe_id_param)
    INTO base_cost;

    -- Get recipe efficiency
    SELECT efficiency
    INTO recipe_efficiency
    FROM public.recipe
    WHERE id = recipe_id_param;

    -- Calculate unit cost, handling potential division by zero or null efficiency
    IF recipe_efficiency IS NULL OR recipe_efficiency = 0 THEN
        unit_cost := base_cost; -- If efficiency is zero or null, treat as 1:1 yield
    ELSE
        unit_cost := base_cost / recipe_efficiency;
    END IF;

    RETURN unit_cost;
END;
$function$;