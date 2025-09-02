/*
  # Add efficiency field to recipe table

  1. Schema Changes
    - Add `efficiency` column to `recipe` table
      - `efficiency` (numeric(5,2), default 1.00)
      - Represents recipe yield/efficiency multiplier

  2. Notes
    - Default efficiency is 1.00 (100% efficiency)
    - Efficiency affects final recipe cost calculation
    - Recipe cost = base cost * efficiency
*/

-- Add efficiency column to recipe table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipe' AND column_name = 'efficiency'
  ) THEN
    ALTER TABLE recipe ADD COLUMN efficiency numeric(5,2) DEFAULT 1.00;
  END IF;
END $$;