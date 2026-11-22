-- A subject merged into another keeps its row, soft-deleted, and remembers
-- the subject that took it in: its old address redirects there instead of
-- answering 404. Written by the subject projector on SubjectMergedInto.
ALTER TABLE subjects ADD COLUMN merged_into_id UUID REFERENCES subjects(id);

COMMENT ON COLUMN subjects.merged_into_id IS
  'The subject this one was merged into; null for a live subject or one simply deleted';
