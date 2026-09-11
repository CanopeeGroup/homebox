-- +goose Up
CREATE TABLE audit_logs (
    id         uuid        NOT NULL PRIMARY KEY,
    group_id   uuid        NOT NULL,
    user_id    uuid        NOT NULL,
    user_name  text        NOT NULL,
    action     text        NOT NULL,
    resource   text        NOT NULL,
    path       text        NOT NULL,
    created_at timestamptz NOT NULL
);
CREATE INDEX audit_logs_group_created_at ON audit_logs (group_id, created_at DESC);

-- +goose Down
DROP TABLE audit_logs;
