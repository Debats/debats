ALTER TABLE positions ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX idx_positions_subject_slug ON positions(subject_id, slug);
