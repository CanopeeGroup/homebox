-- +goose Up
ALTER TABLE groups ALTER COLUMN currency SET DEFAULT 'eur';
UPDATE groups SET currency = 'eur';

-- +goose Down
ALTER TABLE groups ALTER COLUMN currency SET DEFAULT 'usd';
