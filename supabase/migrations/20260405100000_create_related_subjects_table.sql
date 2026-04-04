-- Related subjects: symmetric links between subjects
-- Convention: subject_id_1 < subject_id_2 to prevent duplicate pairs

CREATE TABLE related_subjects (
  subject_id_1 UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  subject_id_2 UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES contributors(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (subject_id_1, subject_id_2),
  CONSTRAINT related_subjects_ordered CHECK (subject_id_1 < subject_id_2),
  CONSTRAINT related_subjects_not_self CHECK (subject_id_1 <> subject_id_2)
);

CREATE INDEX idx_related_subjects_2 ON related_subjects (subject_id_2);

-- RLS: all access goes through admin/service client
ALTER TABLE related_subjects ENABLE ROW LEVEL SECURITY;
