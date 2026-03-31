USE nagrikvaani;
ALTER TABLE complaints ADD COLUMN remarks TEXT DEFAULT NULL;
DESCRIBE complaints;