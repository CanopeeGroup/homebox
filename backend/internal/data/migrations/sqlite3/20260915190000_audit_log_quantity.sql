-- +goose Up
ALTER TABLE audit_logs ADD COLUMN quantity real NULL;

-- +goose Down
-- SQLite cannot safely remove a column on all supported versions. Keeping this
-- additive nullable column is harmless when rolling back.
SELECT 1;
