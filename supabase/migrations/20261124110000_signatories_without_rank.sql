-- The signatories of a joint declaration no longer keep the order in which
-- their signatures were recorded: it said nothing of the text. The page reads
-- them from the most documented on the site to the least.
ALTER TABLE joint_declaration_signatories DROP COLUMN rank;
