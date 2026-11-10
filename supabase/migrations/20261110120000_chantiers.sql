-- A chantier is a piece of content work: a brief written by an admin, the
-- drafts an agent produces from it, and the conversation that made them.
--
-- The agent itself runs elsewhere (a managed session, see ADR 0003); what
-- must survive it lives here: the brief, the drafts, the mirrored
-- conversation, and the last status the site heard of. The session id is the
-- only thing that ties the two sides, and it stays null while the session
-- is being opened.

CREATE TABLE chantiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'working'
    CHECK (status IN ('working', 'waiting', 'blocked', 'ended', 'closed')),
  session_id text UNIQUE,
  last_event_at timestamptz,
  created_by uuid NOT NULL REFERENCES contributors(id),
  updated_by uuid NOT NULL REFERENCES contributors(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE chantiers IS
  'A brief given to the content agent, the drafts it produces and the conversation that made them.';
COMMENT ON COLUMN chantiers.title IS
  'Named by the agent in its first answer; null until then.';
COMMENT ON COLUMN chantiers.status IS
  'working: the agent is at it; waiting: it answered and waits for a person; blocked: it waits for something only the Anthropic console can give (a budget, a tool decision); ended: its session is over; closed: a person closed it.';
COMMENT ON COLUMN chantiers.session_id IS
  'The managed session that runs this chantier. Null while it is being opened, or when opening it failed.';
COMMENT ON COLUMN chantiers.last_event_at IS
  'When the last mirrored session event was processed: the cursor the next mirror reads from.';

-- The conversation, mirrored: what a person sent and what the agent answered.
-- Append-only, so it carries no update audit. A row that mirrors a session
-- event keeps the event id, so mirroring twice writes nothing twice.
CREATE TABLE chantier_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('person', 'agent')),
  text text NOT NULL,
  event_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chantier_messages_chantier_id_idx ON chantier_messages (chantier_id, created_at);

-- A draft belongs to the chantier that produced it. The drafts posted before
-- chantiers existed keep their free-text origin and no chantier.
ALTER TABLE draft_statements
  ADD COLUMN chantier_id uuid REFERENCES chantiers(id) ON DELETE SET NULL;

CREATE INDEX draft_statements_chantier_id_idx ON draft_statements (chantier_id);

COMMENT ON COLUMN draft_statements.chantier_id IS
  'The chantier this draft was produced in, when it was.';

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantier_messages ENABLE ROW LEVEL SECURITY;
