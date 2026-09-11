-- +goose Up
-- SQLite cannot alter a column default without rebuilding its table. Homebox
-- supplies both values through Ent, whose defaults are now zero, so existing
-- databases do not require a destructive table rewrite.
SELECT 1;

-- +goose Down
SELECT 1;
