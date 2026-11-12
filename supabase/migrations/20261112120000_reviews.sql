-- What readers say of an entity of the site: that they checked it
-- (a confirmation) or that something is wrong with it (a flag), and what a
-- moderator made of the flags. Both tables are projections of the `review`
-- stream of the journal, written by its projector in the transaction of the
-- event: nothing else writes them.
--
-- An entity is named by its kind and its id. There is no foreign key: the
-- six kinds live in six tables, and a review outlives nothing — an entity
-- that leaves the site simply stops being shown with its marks.

CREATE TABLE confirmations (
  entity_type text NOT NULL
    CHECK (entity_type IN ('statement', 'subject', 'public_figure', 'organisation', 'position', 'argument')),
  entity_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (entity_id, created_by)
);

COMMENT ON TABLE confirmations IS
  'A reader checked an entity and found it right. One row per reader and entity; withdrawn or reset, the row is gone. Never updated, so it carries no update audit.';

CREATE TABLE flags (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL
    CHECK (entity_type IN ('statement', 'subject', 'public_figure', 'organisation', 'position', 'argument')),
  entity_id uuid NOT NULL,
  reason text NOT NULL
    CHECK (reason IN ('inaccurate_quote', 'source_mismatch', 'wrong_position_or_date', 'duplicate', 'other')),
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'corrected', 'dismissed', 'removed')),
  answer text,
  created_by uuid NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  updated_by uuid NOT NULL REFERENCES contributors(id),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

COMMENT ON TABLE flags IS
  'A reader found something wrong with an entity, and says what. Open until a moderator settles it; withdrawn by its reader, the row is gone.';
COMMENT ON COLUMN flags.status IS
  'open: nobody settled it; corrected: the entity was edited; dismissed: the flag did not hold; removed: the entity left the site.';
COMMENT ON COLUMN flags.answer IS
  'What the moderator who settled the flag checked. Required to dismiss or to remove.';
COMMENT ON COLUMN flags.updated_by IS
  'The reader while the flag is open, then the moderator who settled it.';

CREATE INDEX flags_entity_idx ON flags (entity_id);
CREATE INDEX flags_open_idx ON flags (created_at) WHERE status = 'open';

-- The aggregate refuses a second open flag from the same reader; this is the net under it
CREATE UNIQUE INDEX flags_one_open_per_reader ON flags (entity_id, created_by) WHERE status = 'open';

ALTER TABLE confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Reviews are shown to everyone, signed in or not: that is the point of them.
-- A settled flag is not: what a moderator made of it is read by the server,
-- for those who may settle, never through the public API.
CREATE POLICY "Public read" ON confirmations FOR SELECT USING (true);
CREATE POLICY "Public read of open flags" ON flags FOR SELECT USING (status = 'open');

-- The mark shown at rest beside each entity of a list: how many readers
-- confirmed it, how many flags are open, and what the viewer did herself.
-- Only the entities somebody reviewed come back.
CREATE FUNCTION get_review_marks(p_entity_ids uuid[], p_viewer uuid DEFAULT NULL)
RETURNS TABLE (
  entity_id uuid,
  confirmations integer,
  open_flags integer,
  confirmed_by_viewer boolean,
  flagged_by_viewer boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    reviewed.entity_id,
    sum(reviewed.confirmed)::integer,
    sum(reviewed.flagged)::integer,
    -- IS NOT DISTINCT FROM: a visitor (no viewer) did nothing, which is false and not null
    bool_or(reviewed.confirmed = 1 AND reviewed.reader IS NOT DISTINCT FROM p_viewer),
    bool_or(reviewed.flagged = 1 AND reviewed.reader IS NOT DISTINCT FROM p_viewer)
  FROM (
    SELECT c.entity_id, c.created_by AS reader, 1 AS confirmed, 0 AS flagged
    FROM confirmations c
    WHERE c.entity_id = ANY (p_entity_ids)
    UNION ALL
    SELECT f.entity_id, f.created_by, 0, 1
    FROM flags f
    WHERE f.entity_id = ANY (p_entity_ids) AND f.status = 'open'
  ) reviewed
  GROUP BY reviewed.entity_id
$$;

-- The name a contributor is shown under beside what she confirmed or
-- flagged: her first name and the initial of her last one. The full name
-- stays in auth.users, which nobody but this function reads; null for a
-- contributor who gave none.
CREATE FUNCTION contributor_display_names(p_ids uuid[])
RETURNS TABLE (id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    CASE
      WHEN named.words IS NULL THEN NULL
      WHEN array_length(named.words, 1) = 1 THEN named.words[1]
      ELSE named.words[1] || ' ' || upper(left(named.words[array_length(named.words, 1)], 1)) || '.'
    END
  FROM auth.users u
  CROSS JOIN LATERAL (
    SELECT NULLIF(regexp_split_to_array(btrim(u.raw_user_meta_data ->> 'name'), '\s+'), ARRAY['']) AS words
  ) named
  WHERE u.id = ANY (p_ids)
$$;

REVOKE ALL ON FUNCTION contributor_display_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION contributor_display_names(uuid[]) TO anon, authenticated, service_role;
