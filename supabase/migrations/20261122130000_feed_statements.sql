-- The feed says « X signed the text » once, not once per position the text
-- takes: a signature of a text that takes four positions is four statements,
-- and fifteen signatories would otherwise fill sixty entries with the same
-- words on the same day.
--
-- This view is the statements as the feed lists them: every statement of an
-- author's own, and of each signature the one statement that was recorded
-- first among those still on the site — so a signature keeps its entry when
-- one of its statements leaves with its subject. The feed still narrows to
-- the live ones itself, as it does on the table.
--
-- The view lists the columns of `statements` as they are today: a column
-- added to the table later is not in it until the view is created again.

CREATE VIEW feed_statements WITH (security_invoker = true) AS
SELECT statement.*
FROM statements AS statement
WHERE statement.joint_declaration_id IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM statements AS earlier
     WHERE earlier.joint_declaration_id = statement.joint_declaration_id
       AND earlier.public_figure_id IS NOT DISTINCT FROM statement.public_figure_id
       AND earlier.organisation_id IS NOT DISTINCT FROM statement.organisation_id
       AND earlier.deleted_at IS NULL
       AND (earlier.created_at, earlier.id) < (statement.created_at, statement.id)
   );

COMMENT ON VIEW feed_statements IS
  'The statements as the feed lists them: a signature of a joint declaration counts once, whatever the number of positions the text takes.';
