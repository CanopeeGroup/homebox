package repo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sysadminsmedia/homebox/backend/internal/data/ent"
)

type AuditLogRepository struct {
	db       *ent.Client
	postgres bool
}

type AuditLogEntry struct {
	ID        uuid.UUID `json:"id"`
	GroupID   uuid.UUID `json:"groupId"`
	UserID    uuid.UUID `json:"userId"`
	UserName  string    `json:"userName"`
	Action    string    `json:"action"`
	Resource  string    `json:"resource"`
	Path      string    `json:"path"`
	Count     int       `json:"count"`
	CreatedAt time.Time `json:"createdAt"`
}

func NewAuditLogRepository(db *ent.Client, driver string) *AuditLogRepository {
	return &AuditLogRepository{db: db, postgres: driver == "postgres"}
}

func (r *AuditLogRepository) Create(ctx context.Context, entry AuditLogEntry) error {
	query := `INSERT INTO audit_logs (id, group_id, user_id, user_name, action, resource, path, item_count, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	if r.postgres {
		query = `INSERT INTO audit_logs (id, group_id, user_id, user_name, action, resource, path, item_count, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	}
	_, err := r.db.Sql().ExecContext(ctx, query, entry.ID, entry.GroupID, entry.UserID, entry.UserName,
		entry.Action, entry.Resource, entry.Path, entry.Count, entry.CreatedAt)
	return err
}

func (r *AuditLogRepository) Count(ctx context.Context, groupID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM audit_logs WHERE group_id = ?`
	if r.postgres {
		query = `SELECT COUNT(*) FROM audit_logs WHERE group_id = $1`
	}
	var count int
	err := r.db.Sql().QueryRowContext(ctx, query, groupID).Scan(&count)
	return count, err
}

func (r *AuditLogRepository) GetPage(ctx context.Context, groupID uuid.UUID, limit, offset int) ([]AuditLogEntry, error) {
	query := `SELECT id, group_id, user_id, user_name, action, resource, path, item_count, created_at
		FROM audit_logs WHERE group_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
	if r.postgres {
		query = `SELECT id, group_id, user_id, user_name, action, resource, path, item_count, created_at
			FROM audit_logs WHERE group_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`
	}
	rows, err := r.db.Sql().QueryContext(ctx, query, groupID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]AuditLogEntry, 0)
	for rows.Next() {
		var entry AuditLogEntry
		if err := rows.Scan(&entry.ID, &entry.GroupID, &entry.UserID, &entry.UserName, &entry.Action,
			&entry.Resource, &entry.Path, &entry.Count, &entry.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan audit log: %w", err)
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}
