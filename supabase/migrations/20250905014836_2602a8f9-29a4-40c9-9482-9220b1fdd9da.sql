-- Security Enhancement: Make user_id columns non-nullable
-- This prevents potential data integrity issues and ensures all records are properly associated with users

-- Update customer table: make user_id NOT NULL
-- First, ensure all existing records have a user_id (set to first user if needed)
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE customer SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL for customer table
ALTER TABLE customer ALTER COLUMN user_id SET NOT NULL;

-- Update event table: make user_id NOT NULL
-- First, ensure all existing records have a user_id
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE event SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL for event table
ALTER TABLE event ALTER COLUMN user_id SET NOT NULL;

-- Update item table: make user_id NOT NULL
-- First, ensure all existing records have a user_id
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE item SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL for item table
ALTER TABLE item ALTER COLUMN user_id SET NOT NULL;

-- Update recipe table: make user_id NOT NULL
-- First, ensure all existing records have a user_id
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE recipe SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL for recipe table
ALTER TABLE recipe ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraints for data integrity
-- (Only add if they don't already exist)

-- Customer table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_user_id_fkey'
  ) THEN
    ALTER TABLE customer ADD CONSTRAINT customer_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Event table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'event_user_id_fkey'
  ) THEN
    ALTER TABLE event ADD CONSTRAINT event_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Item table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'item_user_id_fkey'
  ) THEN
    ALTER TABLE item ADD CONSTRAINT item_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Recipe table foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'recipe_user_id_fkey'
  ) THEN
    ALTER TABLE recipe ADD CONSTRAINT recipe_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;