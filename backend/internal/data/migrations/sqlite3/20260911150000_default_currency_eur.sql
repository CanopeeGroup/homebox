-- +goose Up
UPDATE groups SET currency = 'eur';

-- +goose Down
SELECT 1;
