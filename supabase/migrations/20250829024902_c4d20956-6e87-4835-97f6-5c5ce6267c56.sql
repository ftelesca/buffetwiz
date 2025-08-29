-- Create triggers to automatically update event costs

-- Trigger for recipe_item table changes (INSERT, UPDATE, DELETE)
CREATE TRIGGER update_event_costs_on_recipe_item_change
    AFTER INSERT OR UPDATE OR DELETE ON recipe_item
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_costs_on_recipe_item_change();

-- Trigger for item table changes (UPDATE of cost or factor)
CREATE TRIGGER update_event_costs_on_item_change
    AFTER UPDATE ON item
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_costs_on_item_change();

-- Trigger for event_menu table changes (INSERT, DELETE)
CREATE TRIGGER update_event_cost_on_menu_change
    AFTER INSERT OR DELETE ON event_menu
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_cost_on_menu_change();

-- Update all existing event costs to current values
UPDATE event SET cost = calculate_event_cost(id);