-- Enable RLS on event_menu
ALTER TABLE public.event_menu ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_menu based on event ownership
CREATE POLICY "Users can view event menu items for their events"
ON public.event_menu FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = event_menu.event
    AND event.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert event menu items for their events"
ON public.event_menu FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = event_menu.event
    AND event.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update event menu items for their events"
ON public.event_menu FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = event_menu.event
    AND event.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete event menu items for their events"
ON public.event_menu FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = event_menu.event
    AND event.user_id = auth.uid()
  )
);

-- Enable RLS on recipe_item
ALTER TABLE public.recipe_item ENABLE ROW LEVEL SECURITY;

-- RLS policies for recipe_item based on recipe ownership
CREATE POLICY "Users can view recipe items for their recipes"
ON public.recipe_item FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recipe
    WHERE recipe.id = recipe_item.recipe
    AND recipe.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert recipe items for their recipes"
ON public.recipe_item FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recipe
    WHERE recipe.id = recipe_item.recipe
    AND recipe.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recipe items for their recipes"
ON public.recipe_item FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.recipe
    WHERE recipe.id = recipe_item.recipe
    AND recipe.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete recipe items for their recipes"
ON public.recipe_item FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.recipe
    WHERE recipe.id = recipe_item.recipe
    AND recipe.user_id = auth.uid()
  )
);