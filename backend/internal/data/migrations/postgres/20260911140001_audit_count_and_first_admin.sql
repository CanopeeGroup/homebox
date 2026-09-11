-- +goose Up
ALTER TABLE audit_logs ADD COLUMN item_count integer NOT NULL DEFAULT 1;

UPDATE users
SET is_superuser = true
WHERE id = (
    SELECT id FROM users
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE is_superuser = true)
    ORDER BY created_at ASC
    LIMIT 1
);

-- +goose Down
ALTER TABLE audit_logs DROP COLUMN item_count;
