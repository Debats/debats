-- Add taken_at column to statements table
-- This is essential for tracking when a public figure took a position

ALTER TABLE statements 
ADD COLUMN taken_at DATE NOT NULL DEFAULT CURRENT_DATE;