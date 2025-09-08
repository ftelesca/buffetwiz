-- Add isproduct field to item table
ALTER TABLE public.item ADD COLUMN isproduct BOOLEAN NOT NULL DEFAULT false;

-- Create function to handle isproduct logic
CREATE OR REPLACE FUNCTION public.handle_item_isproduct_changes()
RETURNS TRIGGER AS $$
DECLARE
    recipe_id BIGINT;
BEGIN
    -- Handle INSERT or UPDATE with isproduct = true
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.isproduct = true THEN
        -- Check if recipe already exists for this item
        SELECT id INTO recipe_id
        FROM public.recipe 
        WHERE description = NEW.description AND user_id = NEW.user_id;
        
        -- If recipe doesn't exist, create it
        IF recipe_id IS NULL THEN
            INSERT INTO public.recipe (description, efficiency, user_id)
            VALUES (NEW.description, 1.00, NEW.user_id)
            RETURNING id INTO recipe_id;
            
            -- Create recipe_item entry
            INSERT INTO public.recipe_item (recipe, item, qty)
            VALUES (recipe_id, NEW.id, 1);
        END IF;
    END IF;
    
    -- Handle UPDATE: isproduct changed from true to false
    IF TG_OP = 'UPDATE' AND OLD.isproduct = true AND NEW.isproduct = false THEN
        -- Find and delete associated recipe and recipe_item
        SELECT id INTO recipe_id
        FROM public.recipe 
        WHERE description = OLD.description AND user_id = OLD.user_id;
        
        IF recipe_id IS NOT NULL THEN
            -- Delete recipe_item first (due to foreign keys)
            DELETE FROM public.recipe_item WHERE recipe = recipe_id AND item = OLD.id;
            -- Delete recipe
            DELETE FROM public.recipe WHERE id = recipe_id;
        END IF;
    END IF;
    
    -- Handle DELETE of item with isproduct = true
    IF TG_OP = 'DELETE' AND OLD.isproduct = true THEN
        -- Find and delete associated recipe and recipe_item
        SELECT id INTO recipe_id
        FROM public.recipe 
        WHERE description = OLD.description AND user_id = OLD.user_id;
        
        IF recipe_id IS NOT NULL THEN
            -- Delete recipe_item first (due to foreign keys)
            DELETE FROM public.recipe_item WHERE recipe = recipe_id AND item = OLD.id;
            -- Delete recipe
            DELETE FROM public.recipe WHERE id = recipe_id;
        END IF;
    END IF;
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Insumo está associado a evento.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for item isproduct changes
CREATE TRIGGER trigger_item_isproduct_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.item
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_item_isproduct_changes();