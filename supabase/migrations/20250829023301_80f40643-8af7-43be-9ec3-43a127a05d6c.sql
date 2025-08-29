-- Function to calculate the total cost of a recipe based on its items
CREATE OR REPLACE FUNCTION calculate_recipe_cost(recipe_id bigint)
RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql;

-- Function to calculate the total cost of an event based on its menu recipes
CREATE OR REPLACE FUNCTION calculate_event_cost(event_id bigint)
RETURNS numeric AS $$
DECLARE
    total_cost numeric := 0;
BEGIN
    SELECT COALESCE(SUM(calculate_recipe_cost(em.recipe)), 0)
    INTO total_cost
    FROM event_menu em
    WHERE em.event = event_id;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update event costs for all events that include a specific recipe
CREATE OR REPLACE FUNCTION update_events_cost_for_recipe(recipe_id bigint)
RETURNS void AS $$
BEGIN
    UPDATE event 
    SET cost = calculate_event_cost(event.id)
    WHERE event.id IN (
        SELECT DISTINCT em.event 
        FROM event_menu em 
        WHERE em.recipe = recipe_id
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger function for recipe_item changes
CREATE OR REPLACE FUNCTION trigger_update_event_costs_on_recipe_item_change()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger function for item cost changes
CREATE OR REPLACE FUNCTION trigger_update_event_costs_on_item_change()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger function for event_menu changes
CREATE OR REPLACE FUNCTION trigger_update_event_cost_on_menu_change()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers for recipe_item table
DROP TRIGGER IF EXISTS recipe_item_cost_update_trigger ON recipe_item;
CREATE TRIGGER recipe_item_cost_update_trigger
    AFTER INSERT OR UPDATE OR DELETE ON recipe_item
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_costs_on_recipe_item_change();

-- Create triggers for item table
DROP TRIGGER IF EXISTS item_cost_update_trigger ON item;
CREATE TRIGGER item_cost_update_trigger
    AFTER UPDATE ON item
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_costs_on_item_change();

-- Create triggers for event_menu table
DROP TRIGGER IF EXISTS event_menu_cost_update_trigger ON event_menu;
CREATE TRIGGER event_menu_cost_update_trigger
    AFTER INSERT OR DELETE ON event_menu
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_cost_on_menu_change();

-- Update all existing event costs
UPDATE event SET cost = calculate_event_cost(event.id);