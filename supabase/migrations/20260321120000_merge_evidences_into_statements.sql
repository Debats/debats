-- Merge evidences into statements
-- A statement IS a sourced declaration: quote + source + date + figure + position
-- The intermediate "statement" entity (empty association) is removed
-- Evidence rows already contain all the data we need — we enrich, rename, done.

-- Step 1: Add direct FK columns to evidences
ALTER TABLE evidences
  ADD COLUMN public_figure_id UUID REFERENCES public_figures(id) ON DELETE CASCADE,
  ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE CASCADE;

-- Step 2: Populate from the linked statements
UPDATE evidences e SET
  public_figure_id = s.public_figure_id,
  position_id = s.position_id
FROM statements s
WHERE e.statement_id = s.id;

-- Step 3: Make the new FK columns NOT NULL
ALTER TABLE evidences
  ALTER COLUMN public_figure_id SET NOT NULL,
  ALTER COLUMN position_id SET NOT NULL;

-- Step 4: Rename fact_date to stated_at
ALTER TABLE evidences RENAME COLUMN fact_date TO stated_at;

-- Step 5: Drop the old statement_id FK
ALTER TABLE evidences DROP COLUMN statement_id;

-- Step 6: Drop views that depend on statements
DROP VIEW IF EXISTS v_subject_activity_summary;
DROP VIEW IF EXISTS v_public_figure_activity_summary;

-- Step 7: Drop the old statements table and related objects
DROP TABLE IF EXISTS argument_statements;
DROP TRIGGER IF EXISTS update_statements_updated_at ON statements;
DROP TABLE statements;

-- Step 8: Rename evidences to statements
ALTER TABLE evidences RENAME TO statements;

-- Step 9: Rename the trigger
ALTER TRIGGER update_evidences_updated_at ON statements RENAME TO update_statements_updated_at;

-- Step 10: Rename FK constraints inherited from evidences
ALTER TABLE statements RENAME CONSTRAINT evidences_created_by_fkey TO statements_created_by_fkey;
ALTER TABLE statements RENAME CONSTRAINT evidences_public_figure_id_fkey TO statements_public_figure_id_fkey;
ALTER TABLE statements RENAME CONSTRAINT evidences_position_id_fkey TO statements_position_id_fkey;
ALTER TABLE statements RENAME CONSTRAINT evidences_pkey TO statements_pkey;

-- Step 11: Indexes
CREATE INDEX idx_statements_public_figure_id ON statements(public_figure_id);
CREATE INDEX idx_statements_position_id ON statements(position_id);
CREATE INDEX idx_statements_stated_at ON statements(stated_at);

-- Step 12: Recreate the argument_statements junction table
CREATE TABLE argument_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  argument_id UUID NOT NULL REFERENCES arguments(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(argument_id, statement_id)
);

ALTER TABLE argument_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON argument_statements FOR SELECT USING (true);
CREATE POLICY "Authenticated write" ON argument_statements FOR ALL TO authenticated USING (true);

-- Step 13: Recreate views with new schema
CREATE VIEW v_subject_activity_summary AS
SELECT
  s.id,
  s.title,
  s.slug,
  s.presentation,
  s.problem,
  s.picture_url,
  s.created_by,
  s.created_at,
  s.updated_at,
  COALESCE(agg.positions_count, 0)::integer AS positions_count,
  COALESCE(agg.statements_count, 0)::integer AS statements_count,
  COALESCE(agg.public_figures_count, 0)::integer AS public_figures_count,
  agg.latest_statement_at,
  COALESCE(fig.figures, '[]'::jsonb) AS figures
FROM subjects s
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT p.id) AS positions_count,
    COUNT(DISTINCT st.id) AS statements_count,
    COUNT(DISTINCT st.public_figure_id) AS public_figures_count,
    MAX(st.stated_at) AS latest_statement_at
  FROM positions p
  LEFT JOIN statements st ON st.position_id = p.id
  WHERE p.subject_id = s.id
) agg ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
    jsonb_build_object('id', sub.id, 'name', sub.name, 'slug', sub.slug)
  ) AS figures
  FROM (
    SELECT DISTINCT pf.id, pf.name, pf.slug
    FROM statements st
    JOIN positions p ON st.position_id = p.id
    JOIN public_figures pf ON st.public_figure_id = pf.id
    WHERE p.subject_id = s.id
    LIMIT 15
  ) sub
) fig ON true;

GRANT SELECT ON v_subject_activity_summary TO anon, authenticated;

CREATE VIEW v_public_figure_activity_summary AS
SELECT
  pf.id,
  pf.name,
  pf.slug,
  pf.presentation,
  COALESCE(agg.statements_count, 0)::integer AS statements_count,
  COALESCE(agg.subjects_count, 0)::integer AS subjects_count,
  agg.latest_statement_at
FROM public_figures pf
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT s.id) AS statements_count,
    COUNT(DISTINCT p.subject_id) AS subjects_count,
    MAX(s.stated_at) AS latest_statement_at
  FROM statements s
  JOIN positions p ON s.position_id = p.id
  WHERE s.public_figure_id = pf.id
) agg ON true;

GRANT SELECT ON v_public_figure_activity_summary TO anon, authenticated;
