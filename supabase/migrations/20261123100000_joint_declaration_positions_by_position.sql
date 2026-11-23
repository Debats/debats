-- A joint declaration may take several positions on the same subject (two
-- measures it calls for, say): what it takes once is a position, not a
-- subject. The key of what a text takes becomes the position.

ALTER TABLE joint_declaration_positions
  DROP CONSTRAINT joint_declaration_positions_pkey,
  ADD PRIMARY KEY (joint_declaration_id, position_id);

COMMENT ON TABLE joint_declaration_positions IS
  'A position a joint declaration takes, in its own words; several may be on the same subject, each position once. Never updated, so it carries no update audit.';

-- The subjects a text engages are read from here: what its deletion or its merge must reach
CREATE INDEX joint_declaration_positions_subject_idx ON joint_declaration_positions (subject_id);
