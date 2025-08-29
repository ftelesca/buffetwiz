/*
  # Complete BuffetWiz Database Schema

  1. New Tables
    - `unit` - Units of measurement (kg, L, etc.)
    - `item` - Inventory items/ingredients with purchase and usage units
    - `recipe` - Recipe definitions
    - `recipe_item` - Items that belong to recipes with quantities
    - `customer` - Customer information
    - `event` - Event details with customer relationships
    - `event_menu` - Many-to-many relationship between events and recipes
    - `profiles` - User profile information

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (temporary for development)
    - Add authentication-based policies for profiles

  3. Functions
    - Cost calculation functions for recipes and events
    - Trigger functions for automatic cost updates

  4. Triggers
    - Automatic cost recalculation when items, recipes, or events change
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create unit table
CREATE TABLE IF NOT EXISTS unit (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  description varchar NOT NULL
);

-- Create item table
CREATE TABLE IF NOT EXISTS item (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  description varchar NOT NULL,
  unit_purch bigint NOT NULL REFERENCES unit(id),
  unit_use bigint NOT NULL REFERENCES unit(id),
  cost numeric(10,2) DEFAULT 0,
  factor numeric(8,4) DEFAULT 1
);

-- Create recipe table
CREATE TABLE IF NOT EXISTS recipe (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  description varchar NOT NULL
);

-- Create recipe_item table
CREATE TABLE IF NOT EXISTS recipe_item (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  recipe bigint NOT NULL REFERENCES recipe(id),
  item bigint REFERENCES item(id),
  qty numeric(10,3)
);

-- Create customer table
CREATE TABLE IF NOT EXISTS customer (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name varchar NOT NULL,
  address varchar,
  phone varchar,
  email varchar
);

-- Create event table
CREATE TABLE IF NOT EXISTS event (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer bigint NOT NULL REFERENCES customer(id) ON UPDATE RESTRICT,
  date date,
  time time,
  location varchar,
  numguests smallint,
  type varchar,
  title varchar NOT NULL DEFAULT 'Evento sem título',
  description text,
  status varchar,
  cost numeric(10,2),
  price numeric
);

-- Create event_menu table (many-to-many between events and recipes)
CREATE TABLE IF NOT EXISTS event_menu (
  event bigint NOT NULL REFERENCES event(id),
  recipe bigint NOT NULL REFERENCES recipe(id),
  PRIMARY KEY (event, recipe)
);

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE unit ENABLE ROW LEVEL SECURITY;
ALTER TABLE item ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (development mode)
CREATE POLICY IF NOT EXISTS "Anyone can view units" ON unit FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert units" ON unit FOR INSERT TO public WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update units" ON unit FOR UPDATE TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete units" ON unit FOR DELETE TO public USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view items" ON item FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert items" ON item FOR INSERT TO public WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update items" ON item FOR UPDATE TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete items" ON item FOR DELETE TO public USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view recipes" ON recipe FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert recipes" ON recipe FOR INSERT TO public WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update recipes" ON recipe FOR UPDATE TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete recipes" ON recipe FOR DELETE TO public USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view recipe items" ON recipe_item FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert recipe items" ON recipe_item FOR INSERT TO public WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update recipe items" ON recipe_item FOR UPDATE TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete recipe items" ON recipe_item FOR DELETE TO public USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view customers" ON customer FOR ALL TO public USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view events" ON event FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert events" ON event FOR INSERT TO public WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update events" ON event FOR UPDATE TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete events" ON event FOR DELETE TO public USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can view event menus" ON event_menu FOR SELECT TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can insert event menus" ON event_menu FOR INSERT TO public WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Anyone can update event menus" ON event_menu FOR UPDATE TO public USING (true);
CREATE POLICY IF NOT EXISTS "Anyone can delete event menus" ON event_menu FOR DELETE TO public USING (true);

-- Profiles policies (authenticated users only)
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Function to calculate recipe cost
CREATE OR REPLACE FUNCTION calculate_recipe_cost(recipe_id bigint)
RETURNS numeric AS $$
DECLARE
  total_cost numeric := 0;
  recipe_item_record RECORD;
BEGIN
  FOR recipe_item_record IN
    SELECT ri.qty, i.cost, i.factor
    FROM recipe_item ri
    JOIN item i ON ri.item = i.id
    WHERE ri.recipe = recipe_id
  LOOP
    total_cost := total_cost + (recipe_item_record.qty * (recipe_item_record.cost / recipe_item_record.factor));
  END LOOP;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate event cost
CREATE OR REPLACE FUNCTION calculate_event_cost(event_id bigint)
RETURNS numeric AS $$
DECLARE
  total_cost numeric := 0;
  event_recipe_record RECORD;
  recipe_cost numeric;
  event_guests numeric;
BEGIN
  -- Get number of guests for the event
  SELECT numguests INTO event_guests FROM event WHERE id = event_id;
  
  -- If no guests specified, default to 1
  IF event_guests IS NULL THEN
    event_guests := 1;
  END IF;
  
  FOR event_recipe_record IN
    SELECT em.recipe
    FROM event_menu em
    WHERE em.event = event_id
  LOOP
    recipe_cost := calculate_recipe_cost(event_recipe_record.recipe);
    total_cost := total_cost + (recipe_cost * event_guests);
  END LOOP;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update events cost when recipe changes
CREATE OR REPLACE FUNCTION update_events_cost_for_recipe(recipe_id bigint)
RETURNS void AS $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN
    SELECT DISTINCT em.event
    FROM event_menu em
    WHERE em.recipe = recipe_id
  LOOP
    UPDATE event 
    SET cost = calculate_event_cost(event_record.event)
    WHERE id = event_record.event;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for item cost updates
CREATE OR REPLACE FUNCTION trigger_item_cost_update()
RETURNS trigger AS $$
BEGIN
  -- Update all recipes that use this item
  UPDATE recipe 
  SET id = id -- Dummy update to trigger recipe cost recalculation
  WHERE id IN (
    SELECT DISTINCT recipe 
    FROM recipe_item 
    WHERE item = COALESCE(NEW.id, OLD.id)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger function for recipe item updates
CREATE OR REPLACE FUNCTION trigger_recipe_item_cost_update()
RETURNS trigger AS $$
BEGIN
  -- Update the recipe cost and all events using this recipe
  PERFORM update_events_cost_for_recipe(COALESCE(NEW.recipe, OLD.recipe));
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger function for event menu updates
CREATE OR REPLACE FUNCTION trigger_event_menu_cost_update()
RETURNS trigger AS $$
BEGIN
  -- Update the event cost
  UPDATE event 
  SET cost = calculate_event_cost(COALESCE(NEW.event, OLD.event))
  WHERE id = COALESCE(NEW.event, OLD.event);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger function for event numguests updates
CREATE OR REPLACE FUNCTION trigger_event_numguests_update()
RETURNS trigger AS $$
BEGIN
  -- Only update cost if numguests changed
  IF OLD.numguests IS DISTINCT FROM NEW.numguests THEN
    NEW.cost := calculate_event_cost(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS item_cost_trigger ON item;
CREATE TRIGGER item_cost_trigger
  AFTER INSERT OR UPDATE OR DELETE ON item
  FOR EACH ROW EXECUTE FUNCTION trigger_item_cost_update();

DROP TRIGGER IF EXISTS recipe_item_cost_trigger ON recipe_item;
CREATE TRIGGER recipe_item_cost_trigger
  AFTER INSERT OR UPDATE OR DELETE ON recipe_item
  FOR EACH ROW EXECUTE FUNCTION trigger_recipe_item_cost_update();

DROP TRIGGER IF EXISTS event_menu_cost_trigger ON event_menu;
CREATE TRIGGER event_menu_cost_trigger
  AFTER INSERT OR UPDATE OR DELETE ON event_menu
  FOR EACH ROW EXECUTE FUNCTION trigger_event_menu_cost_update();

DROP TRIGGER IF EXISTS event_numguests_cost_trigger ON event;
CREATE TRIGGER event_numguests_cost_trigger
  BEFORE UPDATE ON event
  FOR EACH ROW EXECUTE FUNCTION trigger_event_numguests_update();

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Insert sample units
INSERT INTO unit (description) VALUES 
  ('kg'), ('g'), ('L'), ('ml'), ('un'), ('dz'), ('cx')
ON CONFLICT DO NOTHING;