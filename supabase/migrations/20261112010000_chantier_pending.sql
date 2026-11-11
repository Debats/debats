-- Un chantier peut naître de brouillons déjà là, sans agent : il attend qu'une
-- personne lance l'agent dessus. Statut « pending » : pas de session, rien ne
-- tourne, la page range déjà ses brouillons.
ALTER TABLE chantiers DROP CONSTRAINT chantiers_status_check;
ALTER TABLE chantiers
  ADD CONSTRAINT chantiers_status_check
  CHECK (status IN ('pending', 'working', 'waiting', 'blocked', 'ended', 'closed'));

COMMENT ON COLUMN chantiers.status IS
  'pending: adopté, agent pas encore lancé ; working: the agent is at it; waiting: it answered and waits for a person; blocked: it waits for something only the Anthropic console can give (a budget, a tool decision); ended: its session is over; closed: a person closed it.';
