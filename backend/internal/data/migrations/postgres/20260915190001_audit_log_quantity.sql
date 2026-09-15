-- +goose Up
ALTER TABLE audit_logs ADD COLUMN quantity double precision NULL;

-- +goose Down
ALTER TABLE audit_logs DROP COLUMN quantity;
