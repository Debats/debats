-- A draft may be the signature of a joint declaration: it then names the
-- text by its title, as it names its subject. The validation references the
-- text when the site does not know it, adds the draft's position to it when
-- the text was silent on the subject, and adds the author to its signatories.

ALTER TABLE draft_statements
  ADD COLUMN joint_declaration jsonb;

COMMENT ON COLUMN draft_statements.joint_declaration IS
  'The joint declaration the draft is a signature of: { title, presentation? }. Null for a statement of the author''s own.';
