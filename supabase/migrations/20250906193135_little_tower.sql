/*
  # Add qty column to event_menu table

  1. Schema Changes
    - Add `qty` column to `event_menu` table with default value 1
    - Column type: numeric(10,3) to allow decimal quantities

  2. Notes
    - Default value of 1 ensures existing records remain valid
    - Allows for fractional quantities if needed
*/

-- Add qty column to event_menu table
ALTER TABLE public.event_menu 
ADD COLUMN IF NOT EXISTS qty numeric(10,3) DEFAULT 1;

-- Create recipe cost calculation functions
CREATE OR REPLACE FUNCTION calculate_recipe_base_cost(recipe_id_param bigint)
RETURNS numeric
LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION calculate_recipe_unit_cost(recipe_id_param bigint)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    base_cost numeric := 0;
    recipe_efficiency numeric := 1.00;
    unit_cost numeric := 0;
BEGIN
    -- Get base cost using the new function
    SELECT calculate_recipe_base_cost(recipe_id_param)
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
$$;