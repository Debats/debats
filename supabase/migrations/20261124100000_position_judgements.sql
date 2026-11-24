-- Two positions of one subject judged against each other: compatible (they
-- are held together) or not (taking one leaves the other). A projection of
-- the `PositionsJudged` events of the `subject` stream, written by its
-- projector in the transaction of the event: nothing else writes it.
--
-- A pair nobody judged has no row, and reads as contradictory.
-- Convention: position_id_1 < position_id_2, so that a pair is stored once.

CREATE TABLE position_judgements (
  position_id_1 uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  position_id_2 uuid NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  compatible boolean NOT NULL,
  created_by uuid NOT NULL REFERENCES contributors(id),
  updated_by uuid NOT NULL REFERENCES contributors(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (position_id_1, position_id_2),
  CONSTRAINT position_judgements_ordered CHECK (position_id_1 < position_id_2)
);

COMMENT ON TABLE position_judgements IS
  'Whether two positions of a subject are held together (compatible) or against each other. One row per judged pair, the smaller id first; a pair without a row reads as contradictory.';

CREATE INDEX idx_position_judgements_2 ON position_judgements (position_id_2);

ALTER TABLE position_judgements ENABLE ROW LEVEL SECURITY;

-- Shown to everyone: the pages read it to tell a change of position from two positions held together
CREATE POLICY "Public read" ON position_judgements FOR SELECT USING (true);
