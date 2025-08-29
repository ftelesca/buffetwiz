/*
  # Update database policies to use CREATE OR REPLACE

  1. Security Updates
    - Replace all existing policies with CREATE OR REPLACE POLICY
    - Maintain same policy logic and permissions
    - Ensure all tables have proper RLS enabled

  2. Tables Updated
    - unit: Anyone can perform all operations
    - item: Anyone can perform all operations  
    - recipe: Anyone can perform all operations
    - recipe_item: Anyone can perform all operations
    - customer: Anyone can perform all operations
    - event: Anyone can perform all operations
    - event_menu: Anyone can perform all operations

  3. Triggers
    - Maintain all existing cost calculation triggers
*/

-- Enable RLS on all tables
ALTER TABLE unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE item ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menu ENABLE ROW LEVEL SECURITY;

-- Unit table policies
CREATE OR REPLACE POLICY "Anyone can view units"
  ON unit
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can insert units"
  ON unit
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE OR REPLACE POLICY "Anyone can update units"
  ON unit
  FOR UPDATE
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can delete units"
  ON unit
  FOR DELETE
  TO public
  USING (true);

-- Item table policies
CREATE OR REPLACE POLICY "Anyone can view items"
  ON item
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can insert items"
  ON item
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE OR REPLACE POLICY "Anyone can update items"
  ON item
  FOR UPDATE
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can delete items"
  ON item
  FOR DELETE
  TO public
  USING (true);

-- Recipe table policies
CREATE OR REPLACE POLICY "Anyone can view recipes"
  ON recipe
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can insert recipes"
  ON recipe
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE OR REPLACE POLICY "Anyone can update recipes"
  ON recipe
  FOR UPDATE
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can delete recipes"
  ON recipe
  FOR DELETE
  TO public
  USING (true);

-- Recipe item table policies
CREATE OR REPLACE POLICY "Anyone can view recipe items"
  ON recipe_item
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can insert recipe items"
  ON recipe_item
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE OR REPLACE POLICY "Anyone can update recipe items"
  ON recipe_item
  FOR UPDATE
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can delete recipe items"
  ON recipe_item
  FOR DELETE
  TO public
  USING (true);

-- Customer table policies
CREATE OR REPLACE POLICY "Anyone can do all to customers"
  ON customer
  FOR ALL
  TO public
  USING (true);

-- Event table policies
CREATE OR REPLACE POLICY "Anyone can view events"
  ON event
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can insert events"
  ON event
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE OR REPLACE POLICY "Anyone can update events"
  ON event
  FOR UPDATE
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can delete events"
  ON event
  FOR DELETE
  TO public
  USING (true);

-- Event menu table policies
CREATE OR REPLACE POLICY "Anyone can view event menus"
  ON event_menu
  FOR SELECT
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can insert event menus"
  ON event_menu
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE OR REPLACE POLICY "Anyone can update event menus"
  ON event_menu
  FOR UPDATE
  TO public
  USING (true);

CREATE OR REPLACE POLICY "Anyone can delete event menus"
  ON event_menu
  FOR DELETE
  TO public
  USING (true);