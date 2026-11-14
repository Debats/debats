-- What the agent of a chantier has still to be told. A review made while the
-- agent does not hear (stopped at its budget, or out of reach) stands all the
-- same; its notice waits here, out of the thread, which only holds what the
-- agent heard. It is told with the next review or once the budget is pushed
-- further, then moves to chantier_messages and leaves this table.
-- Process state, like the rest of a chantier: no update audit, and the rows
-- go with their chantier.
CREATE TABLE chantier_unheard_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chantier_unheard_notices_chantier_id_idx
  ON chantier_unheard_notices (chantier_id, created_at);

COMMENT ON TABLE chantier_unheard_notices IS
  'Review notices the agent of a chantier has not heard yet, kept until it does.';

ALTER TABLE chantier_unheard_notices ENABLE ROW LEVEL SECURITY;
