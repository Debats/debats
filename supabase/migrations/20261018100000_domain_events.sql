-- Journal des événements du domaine : la mémoire du site, écrite dans la même
-- transaction que les tables qu'elle explique. Les tables existantes restent
-- la source de vérité des lectures (projections) ; le journal devient celle
-- des écritures, agrégat par agrégat. Voir docs/adr/0001-journal-des-evenements.md.
--
-- Un flux = un agrégat (stream_type + stream_id). Chaque événement porte la
-- révision de l'agrégat qu'il produit, à partir de 1 ; l'unicité
-- (flux, révision) porte la concurrence optimiste et sert d'index de lecture.

CREATE TABLE domain_events (
  id BIGSERIAL PRIMARY KEY,
  stream_type TEXT NOT NULL,
  stream_id UUID NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Qui a agi (contributeur), et tout contexte utile (import, migration…)
  actor_id UUID REFERENCES contributors(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stream_type, stream_id, revision)
);

CREATE INDEX idx_domain_events_type ON domain_events (type, occurred_at);
CREATE INDEX idx_domain_events_occurred_at ON domain_events (occurred_at);

-- Jamais exposé par PostgREST : seule la couche d'écriture serveur y accède
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON domain_events FROM anon, authenticated;
