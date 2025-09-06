/*
  # Create Recipe Cost Calculation Functions

  1. New Functions
    - `calculate_recipe_base_cost(recipe_id_param bigint)` - Calculates the base cost of a recipe by summing all item costs
    - `calculate_recipe_unit_cost(recipe_id_param bigint)` - Calculates the unit cost by dividing base cost by recipe efficiency

  2. Security
    - Functions are accessible to authenticated users
    - Functions only calculate costs, no data modification

  3. Purpose
    - Centralize recipe cost calculation logic in the database
    - Ensure consistent cost calculations across the application
    - Improve performance by reducing client-side calculations
*/

-- Function to calculate the base cost of a recipe
CREATE OR REPLACE FUNCTION calculate_recipe_base_cost(recipe_id_param bigint)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to calculate the unit cost of a recipe (base cost / efficiency)
CREATE OR REPLACE FUNCTION calculate_recipe_unit_cost(recipe_id_param bigint)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
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
    SELECT COALESCE(efficiency, 1.00)
    INTO recipe_efficiency
    FROM public.recipe
    WHERE id = recipe_id_param;

    -- Calculate unit cost, handling potential division by zero
    IF recipe_efficiency IS NULL OR recipe_efficiency = 0 THEN
        unit_cost := base_cost; -- If efficiency is zero or null, treat as 1:1 yield
    ELSE
        unit_cost := base_cost / recipe_efficiency;
    END IF;

    RETURN unit_cost;
END;
$$;