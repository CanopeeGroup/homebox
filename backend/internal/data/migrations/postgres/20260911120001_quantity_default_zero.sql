-- +goose Up
ALTER TABLE items ALTER COLUMN quantity SET DEFAULT 0;
ALTER TABLE item_templates ALTER COLUMN default_quantity SET DEFAULT 0;

-- +goose Down
ALTER TABLE items ALTER COLUMN quantity SET DEFAULT 1;
ALTER TABLE item_templates ALTER COLUMN default_quantity SET DEFAULT 1;
