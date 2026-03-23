UPDATE draft_statements SET origin = 'unknown' WHERE origin IS NULL;
ALTER TABLE draft_statements ALTER COLUMN origin SET NOT NULL;
