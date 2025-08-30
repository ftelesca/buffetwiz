/*
  # Add user_id to units table

  1. Schema Changes
    - Add `user_id` column to `unit` table
    - Set default value for existing records
    - Add foreign key constraint to users table

  2. Security Updates
    - Update RLS policies to filter by user_id
    - Ensure users can only see their own units

  3. Data Migration
    - Existing units will be assigned to the first user in the system
    - New units will require user_id
*/

-- Add user_id column to unit table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unit' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE unit ADD COLUMN user_id uuid;
  END IF;
END $$;

-- Set default user_id for existing records (assign to first user)
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    UPDATE unit SET user_id = first_user_id WHERE user_id IS NULL;
  END IF;
END $$;

-- Make user_id NOT NULL after setting defaults
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unit' AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE unit ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unit_user_id_fkey'
  ) THEN
    ALTER TABLE unit ADD CONSTRAINT unit_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can manage units" ON unit;
DROP POLICY IF EXISTS "Authenticated users can view units" ON unit;

-- Create new RLS policies for user isolation
CREATE POLICY "Users can view their own units"
  ON unit
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own units"
  ON unit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own units"
  ON unit
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own units"
  ON unit
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);