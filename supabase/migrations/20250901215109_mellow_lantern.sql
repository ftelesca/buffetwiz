/*
  # Add duration field to events table

  1. Changes
    - Add `duration` column to `event` table (integer, in minutes)
    - Set default value to 120 minutes (2 hours)

  2. Notes
    - Duration is stored in minutes for flexibility
    - Default duration of 2 hours for new events
    - Existing events will get the default duration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event' AND column_name = 'duration'
  ) THEN
    ALTER TABLE event ADD COLUMN duration integer DEFAULT 120;
  END IF;
END $$;

COMMENT ON COLUMN event.duration IS 'Event duration in minutes';