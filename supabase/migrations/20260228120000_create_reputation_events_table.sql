-- Table d'historique des mouvements de réputation
-- Source de vérité pour la réputation. contributors.reputation est un cache
-- synchronisé automatiquement par le trigger trg_sync_reputation.

CREATE TABLE reputation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  amount INTEGER NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reputation_events_contributor ON reputation_events(contributor_id);
CREATE INDEX idx_reputation_events_created_at ON reputation_events(created_at);

-- Trigger : recalcule contributors.reputation après chaque INSERT
CREATE OR REPLACE FUNCTION sync_contributor_reputation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contributors
  SET reputation = (
    SELECT COALESCE(SUM(amount), 0)
    FROM reputation_events
    WHERE contributor_id = NEW.contributor_id
  )
  WHERE id = NEW.contributor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_reputation
  AFTER INSERT ON reputation_events
  FOR EACH ROW EXECUTE FUNCTION sync_contributor_reputation();

-- RLS : les contributeurs voient leur propre historique
ALTER TABLE reputation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributors read own reputation events" ON reputation_events
  FOR SELECT TO authenticated
  USING (auth.uid() = contributor_id);
