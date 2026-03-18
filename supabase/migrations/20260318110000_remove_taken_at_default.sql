-- Remove DEFAULT on taken_at to force explicit date at insert time.
-- The date of the fact must always come from user input, never default to today.
ALTER TABLE statements ALTER COLUMN taken_at DROP DEFAULT;
