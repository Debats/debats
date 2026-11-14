-- What the agent of a chantier had spent against its cap, kept once the
-- chantier is closed. The figures live in the session and move while the
-- chantier is open; a closed chantier no longer spends, so the list of
-- chantiers asks its session once, keeps the answer here, and leaves the
-- session alone from then on. In US cents, at list price.
ALTER TABLE chantiers
  ADD COLUMN spent_cents integer,
  ADD COLUMN cap_cents integer,
  ADD CONSTRAINT chantiers_spend_whole
    CHECK ((spent_cents IS NULL) = (cap_cents IS NULL));

COMMENT ON COLUMN chantiers.spent_cents IS
  'What the session had spent when the closed chantier was last asked, in US cents at list price. Null while the chantier is open, or when its session runs without a cap.';
COMMENT ON COLUMN chantiers.cap_cents IS
  'The cap the session ran under when spent_cents was read, in US cents. Set and null together with spent_cents.';
