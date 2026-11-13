-- The home page's « sources citées » counted the distinct names given to the
-- sources. A name is free text and one name covers many documents (« France
-- Info » stands for every interview aired there): the figure was neither a
-- count of outlets nor a count of documents. A source is the document a
-- statement cites, and its address is what tells two of them apart.

CREATE OR REPLACE FUNCTION get_site_figures()
RETURNS TABLE (
  subjects bigint,
  positions bigint,
  statements bigint,
  public_figures bigint,
  organisations bigint,
  sources bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    (SELECT COUNT(*) FROM subjects WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM positions p
      JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
      WHERE p.deleted_at IS NULL),
    (SELECT COUNT(*) FROM statements WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM public_figures WHERE deleted_at IS NULL),
    (SELECT COUNT(*) FROM organisations WHERE deleted_at IS NULL),
    (SELECT COUNT(DISTINCT source_url) FROM statements WHERE deleted_at IS NULL);
$$;
