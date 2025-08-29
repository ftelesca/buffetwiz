/*
  # Update Database Policies to use CREATE OR REPLACE

  1. Policy Updates
    - Replace all existing policies with CREATE OR REPLACE POLICY syntax
    - Maintain same permissions and logic
    - Ensure policies work correctly with updated syntax

  2. Security
    - All tables maintain RLS enabled
    - Public access policies for development
    - Authenticated user policies for profiles
*/

-- Unit policies
CREATE OR REPLACE POLICY "Anyone can view units" ON unit FOR SELECT TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can insert units" ON unit FOR INSERT TO public WITH CHECK (true);
CREATE OR REPLACE POLICY "Anyone can update units" ON unit FOR UPDATE TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can delete units" ON unit FOR DELETE TO public USING (true);

-- Item policies
CREATE OR REPLACE POLICY "Anyone can view items" ON item FOR SELECT TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can insert items" ON item FOR INSERT TO public WITH CHECK (true);
CREATE OR REPLACE POLICY "Anyone can update items" ON item FOR UPDATE TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can delete items" ON item FOR DELETE TO public USING (true);

-- Recipe policies
CREATE OR REPLACE POLICY "Anyone can view recipes" ON recipe FOR SELECT TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can insert recipes" ON recipe FOR INSERT TO public WITH CHECK (true);
CREATE OR REPLACE POLICY "Anyone can update recipes" ON recipe FOR UPDATE TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can delete recipes" ON recipe FOR DELETE TO public USING (true);

-- Recipe item policies
CREATE OR REPLACE POLICY "Anyone can view recipe items" ON recipe_item FOR SELECT TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can insert recipe items" ON recipe_item FOR INSERT TO public WITH CHECK (true);
CREATE OR REPLACE POLICY "Anyone can update recipe items" ON recipe_item FOR UPDATE TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can delete recipe items" ON recipe_item FOR DELETE TO public USING (true);

-- Customer policies
CREATE OR REPLACE POLICY "Anyone can do all to customers" ON customer FOR ALL TO public USING (true);

-- Event policies
CREATE OR REPLACE POLICY "Anyone can view events" ON event FOR SELECT TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can insert events" ON event FOR INSERT TO public WITH CHECK (true);
CREATE OR REPLACE POLICY "Anyone can update events" ON event FOR UPDATE TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can delete events" ON event FOR DELETE TO public USING (true);

-- Event menu policies
CREATE OR REPLACE POLICY "Anyone can view event menus" ON event_menu FOR SELECT TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can insert event menus" ON event_menu FOR INSERT TO public WITH CHECK (true);
CREATE OR REPLACE POLICY "Anyone can update event menus" ON event_menu FOR UPDATE TO public USING (true);
CREATE OR REPLACE POLICY "Anyone can delete event menus" ON event_menu FOR DELETE TO public USING (true);

-- Profile policies (authenticated users only)
CREATE OR REPLACE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE OR REPLACE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE OR REPLACE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);