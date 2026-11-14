-- The context of the agent of a chantier, and what reducing it leaves behind.
-- An agent reads everything it carries again at every step: the size of
-- that is what a step costs, so the site keeps the last size it read, and
-- offers to reduce it once it has grown. Reducing it opens a new session,
-- told what the thread said so far: the session left behind stays where it
-- ran until the chantier is deleted, and what it spent is added to what the
-- chantier spent before, the new session starting again under its own cap.
ALTER TABLE chantiers
  ADD COLUMN context_tokens integer,
  ADD COLUMN earlier_spent_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN past_session_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT chantiers_context_tokens_positive
    CHECK (context_tokens IS NULL OR context_tokens >= 0),
  ADD CONSTRAINT chantiers_earlier_spent_positive
    CHECK (earlier_spent_cents >= 0);

COMMENT ON COLUMN chantiers.context_tokens IS
  'How many tokens the agent read at its last step: all it carries. Null until a session said, and again once the context was reduced.';
COMMENT ON COLUMN chantiers.earlier_spent_cents IS
  'What the sessions left behind had spent, in US cents at list price. Zero for a chantier whose context was never reduced.';
COMMENT ON COLUMN chantiers.past_session_ids IS
  'The sessions left behind when the context was reduced, the oldest first: erased where they ran when the chantier is deleted.';

-- The notebook of a chantier: the pages its agent read and found worth
-- keeping, each with a line on what it holds, dead ends included. The agent
-- writes it through the API as it goes, so that what it read outlives its
-- session: a new session starts with an empty disk. One row per address in
-- a chantier; noted again, an address takes its new note.
-- Process state, like the rest of a chantier: no author, and the rows go
-- with their chantier.
CREATE TABLE chantier_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  url text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chantier_sources_one_per_address UNIQUE (chantier_id, url)
);

CREATE INDEX chantier_sources_chantier_id_idx
  ON chantier_sources (chantier_id, created_at);

COMMENT ON TABLE chantier_sources IS
  'The pages the agent of a chantier read and found worth keeping, with a line on what each holds.';

ALTER TABLE chantier_sources ENABLE ROW LEVEL SECURITY;

-- A review no longer wakes the agent: its notice waits until the person
-- hands her reviews over, so a draft may be reviewed again meanwhile (sent
-- back, then validated). Only its last review is told: the notice names its
-- draft, and one draft has one notice waiting. The notices kept before this
-- name no draft and stay as they are.
ALTER TABLE chantier_unheard_notices
  ADD COLUMN draft_id uuid REFERENCES draft_statements(id) ON DELETE CASCADE,
  ADD CONSTRAINT chantier_unheard_notices_one_per_draft UNIQUE (draft_id);

COMMENT ON COLUMN chantier_unheard_notices.draft_id IS
  'The draft the notice is about: reviewed again, it takes the place of the notice kept before. Null for a notice kept before the column existed.';
