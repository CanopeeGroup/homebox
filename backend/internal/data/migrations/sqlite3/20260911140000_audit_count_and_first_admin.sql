-- +goose Up
ALTER TABLE audit_logs ADD COLUMN item_count integer NOT NULL DEFAULT 1;

-- Existing installations may predate automatic administrator assignment.
-- Promote only the oldest account, and only when no administrator exists.
UPDATE users
SET is_superuser = true
WHERE id = (
    SELECT id FROM users
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE is_superuser = true)
    ORDER BY created_at ASC
    LIMIT 1
);

-- +goose Down
-- SQLite cannot safely remove a column on all supported versions. Keeping the
-- additive item_count column is harmless when rolling back.
SELECT 1;
