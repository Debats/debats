CREATE OR REPLACE FUNCTION merge_positions(source_id UUID, target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE statements SET position_id = target_id, updated_at = now()
    WHERE position_id = source_id;
  DELETE FROM positions WHERE id = source_id;
END;
$$ LANGUAGE plpgsql;
