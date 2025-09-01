-- Fix security warnings by setting search_path for all functions

-- Function to calculate the total cost of a recipe based on its items
CREATE OR REPLACE FUNCTION calculate_recipe_cost(recipe_id bigint)
RETURNS numeric 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_cost numeric := 0;
BEGIN
    SELECT COALESCE(SUM(ri.qty * i.cost * i.factor), 0)
    INTO total_cost
    FROM recipe_item ri
    JOIN item i ON ri.item = i.id
    WHERE ri.recipe = recipe_id;
    
    RETURN total_cost;
END;
$$;

-- Function to calculate the total cost of an event based on its menu recipes
CREATE OR REPLACE FUNCTION calculate_event_cost(event_id bigint)
RETURNS numeric 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_cost numeric := 0;
BEGIN
    SELECT COALESCE(SUM(calculate_recipe_cost(em.recipe)), 0)
    INTO total_cost
    FROM event_menu em
    WHERE em.event = event_id;
    
    RETURN total_cost;
END;
$$;

-- Function to update event costs for all events that include a specific recipe
CREATE OR REPLACE FUNCTION update_events_cost_for_recipe(recipe_id bigint)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE event 
    SET cost = calculate_event_cost(event.id)
    WHERE event.id IN (
        SELECT DISTINCT em.event 
        FROM event_menu em 
        WHERE em.recipe = recipe_id
    );
END;
$$;

-- Trigger function for recipe_item changes
CREATE OR REPLACE FUNCTION trigger_update_event_costs_on_recipe_item_change()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_events_cost_for_recipe(NEW.recipe);
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        PERFORM update_events_cost_for_recipe(OLD.recipe);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger function for item cost changes
CREATE OR REPLACE FUNCTION trigger_update_event_costs_on_item_change()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- When item cost or factor changes, update all events that use recipes containing this item
    IF TG_OP = 'UPDATE' AND (OLD.cost != NEW.cost OR OLD.factor != NEW.factor) THEN
        -- Find all recipes that use this item and update their events
        PERFORM update_events_cost_for_recipe(ri.recipe)
        FROM recipe_item ri 
        WHERE ri.item = NEW.id;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger function for event_menu changes
CREATE OR REPLACE FUNCTION trigger_update_event_cost_on_menu_change()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Handle INSERT and DELETE
    IF TG_OP = 'INSERT' THEN
        UPDATE event SET cost = calculate_event_cost(NEW.event) WHERE id = NEW.event;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE event SET cost = calculate_event_cost(OLD.event) WHERE id = OLD.event;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;