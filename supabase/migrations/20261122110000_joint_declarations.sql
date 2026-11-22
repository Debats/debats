-- A joint declaration is a text several personalities or organisations sign
-- together: a tribune, a manifesto, an appeal, an open letter. Signing it is
-- taking each of the positions it takes.
--
-- The three tables are projections of the `joint_declaration` stream of the
-- journal, written by its projector in the transaction of the event: nothing
-- else writes them. The statements a signature makes are ordinary statements,
-- which name the joint declaration they come from.

CREATE TABLE joint_declarations (
  id uuid PRIMARY KEY,
  title varchar(150) NOT NULL,
  slug text NOT NULL UNIQUE,
  presentation text,
  source_name varchar(255) NOT NULL,
  source_url text NOT NULL,
  declared_at date NOT NULL,
  created_by uuid NOT NULL REFERENCES contributors(id),
  updated_by uuid NOT NULL REFERENCES contributors(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

COMMENT ON TABLE joint_declarations IS
  'A text signed by several: tribune, manifesto, appeal, open letter. Projection of the joint_declaration stream.';
COMMENT ON COLUMN joint_declarations.presentation IS
  'What the text is, in a line: its subtitle, or what it calls for.';
COMMENT ON COLUMN joint_declarations.declared_at IS
  'The day the text was made public: every signature is dated with it.';

CREATE INDEX joint_declarations_declared_at_idx ON joint_declarations (declared_at DESC);
CREATE INDEX joint_declarations_source_url_idx ON joint_declarations (source_url);

CREATE TABLE joint_declaration_positions (
  joint_declaration_id uuid NOT NULL REFERENCES joint_declarations(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  position_id uuid NOT NULL REFERENCES positions(id),
  quote text NOT NULL,
  rank integer NOT NULL,
  created_by uuid NOT NULL REFERENCES contributors(id),
  created_at timestamptz NOT NULL,
  -- A text speaks once on a subject: the aggregate refuses a second position, this is the net under it
  PRIMARY KEY (joint_declaration_id, subject_id)
);

COMMENT ON TABLE joint_declaration_positions IS
  'What a joint declaration says on one subject: the position it takes, in its own words. Never updated, so it carries no update audit.';
COMMENT ON COLUMN joint_declaration_positions.quote IS
  'The words of the text that state the position: the quote of every signatory''s statement.';
COMMENT ON COLUMN joint_declaration_positions.rank IS
  'The order in which the text was found to take its positions, from 1.';

CREATE INDEX joint_declaration_positions_position_idx ON joint_declaration_positions (position_id);

CREATE TABLE joint_declaration_signatories (
  -- A row of its own key: the signatory is one of two columns, which no primary key can span
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joint_declaration_id uuid NOT NULL REFERENCES joint_declarations(id) ON DELETE CASCADE,
  public_figure_id uuid REFERENCES public_figures(id),
  organisation_id uuid REFERENCES organisations(id),
  rank integer NOT NULL,
  created_by uuid NOT NULL REFERENCES contributors(id),
  created_at timestamptz NOT NULL,
  CONSTRAINT joint_declaration_signatories_single_author
    CHECK ((public_figure_id IS NULL) <> (organisation_id IS NULL))
);

COMMENT ON TABLE joint_declaration_signatories IS
  'Who signed a joint declaration: a personality or an organisation, never both. Never updated, so it carries no update audit.';
COMMENT ON COLUMN joint_declaration_signatories.rank IS
  'The order in which the signatures were recorded on the site, from 1.';

-- The aggregate refuses a second signature of the same signatory; these are the net under it
CREATE UNIQUE INDEX joint_declaration_signatories_figure_key
  ON joint_declaration_signatories (joint_declaration_id, public_figure_id)
  WHERE public_figure_id IS NOT NULL;
CREATE UNIQUE INDEX joint_declaration_signatories_organisation_key
  ON joint_declaration_signatories (joint_declaration_id, organisation_id)
  WHERE organisation_id IS NOT NULL;
CREATE INDEX joint_declaration_signatories_figure_idx
  ON joint_declaration_signatories (public_figure_id) WHERE public_figure_id IS NOT NULL;
CREATE INDEX joint_declaration_signatories_organisation_idx
  ON joint_declaration_signatories (organisation_id) WHERE organisation_id IS NOT NULL;

ALTER TABLE statements
  ADD COLUMN joint_declaration_id uuid REFERENCES joint_declarations(id);

COMMENT ON COLUMN statements.joint_declaration_id IS
  'The joint declaration the statement is a signature of: its position, words, source and date are the text''s. Null for a statement of the author''s own.';

CREATE INDEX statements_joint_declaration_idx
  ON statements (joint_declaration_id) WHERE joint_declaration_id IS NOT NULL;

ALTER TABLE joint_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_declaration_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_declaration_signatories ENABLE ROW LEVEL SECURITY;

-- Read by everyone, signed in or not; written only by the projector
CREATE POLICY "Public read" ON joint_declarations FOR SELECT USING (true);
CREATE POLICY "Public read" ON joint_declaration_positions FOR SELECT USING (true);
CREATE POLICY "Public read" ON joint_declaration_signatories FOR SELECT USING (true);
