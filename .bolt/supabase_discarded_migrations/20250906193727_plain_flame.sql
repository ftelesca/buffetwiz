/*
  # Update calculate_event_cost function

  1. Function Updates
    - Update `calculate_event_cost` to use the new `calculate_recipe_unit_cost` function
    - Consider the `qty` field from `event_menu` table
    - Calculate total event cost as sum of (recipe_qty * recipe_unit_cost)

  2. Changes Made
    - Modified function to use `em.qty * calculate_recipe_unit_cost(em.recipe)`
    - Ensures consistency with new recipe cost calculation approach
    - Properly handles quantities specified in event menu
*/

CREATE OR REPLACE FUNCTION calculate_event_cost(event_id_param bigint)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    total_event_cost numeric := 0;
BEGIN
    SELECT COALESCE(SUM(em.qty * calculate_recipe_unit_cost(em.recipe)), 0)
    INTO total_event_cost
    FROM public.event_menu em
    WHERE em.event = event_id_param;

    RETURN total_event_cost;
END;
$$;