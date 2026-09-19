package services

import (
	"archive/zip"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"gocloud.dev/blob"
)

// InstanceBackupSchemaVersion versions the full-instance backup format.
// Unlike collection exports, this format preserves IDs because restore replaces
// the complete application data set rather than merging into an existing tenant.
const InstanceBackupSchemaVersion = 1

const instanceManifestFile = "instance-manifest.json"
const instanceAttachmentsDir = "attachments/"

type instanceBackupManifest struct {
	SchemaVersion int            `json:"schemaVersion"`
	ExportedAt    time.Time      `json:"exportedAt"`
	Counts        map[string]int `json:"counts"`
}

// Tables that make up persistent application state. Ephemeral authentication
// sessions, password-reset tokens and previous backup job rows are deliberately
// excluded: restoring them would revive sessions/tokens or recursively back up
// backup artifacts. Users.settings IS included, so adminAvatar/appTitle and
// every other persistent user setting round-trip with the instance.
var instanceBackupTables = []string{
	"groups",
	"users",
	"user_groups",
	"entity_types",
	"entity_templates",
	"template_fields",
	"tags",
	"entities",
	"entity_fields",
	"maintenance_entries",
	"attachments",
	"tag_entities",
	"notifiers",
	"group_invitation_tokens",
	"api_keys",
}

var instanceDeferredColumns = map[string][]string{
	"entity_types":     {"entity_type_default_template"},
	"entity_templates": {"entity_template_location"},
	"tags":             {"tag_children"},
	"entities":         {"entity_children"},
	"attachments":      {"attachment_thumbnail"},
}

// WriteInstanceBackup writes a complete logical backup of the Homebox instance.
// It is intentionally not tenant-scoped: callers must protect it with superuser
// middleware. Password hashes, memberships, all collections, user settings,
// inventory data and attachment blobs are included.
func (s *ExportService) WriteInstanceBackup(ctx context.Context, out io.Writer) error {
	zw := zip.NewWriter(out)
	db := s.db.Sql()
	counts := make(map[string]int, len(instanceBackupTables))

	for _, table := range instanceBackupTables {
		rows, err := dumpWholeTable(ctx, db, table)
		if err != nil {
			_ = zw.Close()
			return fmt.Errorf("instance backup dump %s: %w", table, err)
		}
		counts[table] = len(rows)
		w, err := zw.Create("tables/" + table + ".json")
		if err != nil {
			_ = zw.Close()
			return err
		}
		if err := json.NewEncoder(w).Encode(rows); err != nil {
			_ = zw.Close()
			return err
		}
	}

	if err := s.copyAllAttachmentBlobs(ctx, zw); err != nil {
		_ = zw.Close()
		return fmt.Errorf("instance backup attachments: %w", err)
	}

	mw, err := zw.Create(instanceManifestFile)
	if err != nil {
		_ = zw.Close()
		return err
	}
	if err := json.NewEncoder(mw).Encode(instanceBackupManifest{
		SchemaVersion: InstanceBackupSchemaVersion,
		ExportedAt:    time.Now().UTC(),
		Counts:        counts,
	}); err != nil {
		_ = zw.Close()
		return err
	}
	return zw.Close()
}

func dumpWholeTable(ctx context.Context, db *sql.DB, table string) ([]map[string]any, error) {
	if !isValidSQLIdent(table) {
		return nil, fmt.Errorf("invalid table %q", table)
	}
	rows, err := db.QueryContext(ctx, "SELECT * FROM "+table)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	out := make([]map[string]any, 0)
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = normalizeScan(vals[i])
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *ExportService) copyAllAttachmentBlobs(ctx context.Context, zw *zip.Writer) error {
	rows, err := s.db.Sql().QueryContext(ctx, "SELECT id, path FROM attachments WHERE path IS NOT NULL AND path <> ''")
	if err != nil {
		return err
	}
	defer func() { _ = rows.Close() }()
	type ref struct{ id, path string }
	var refs []ref
	for rows.Next() {
		var r ref
		if err := rows.Scan(&r.id, &r.path); err != nil {
			return err
		}
		refs = append(refs, r)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	bucket, err := blob.OpenBucket(ctx, s.repos.Attachments.GetScopedConnString())
	if err != nil {
		return err
	}
	defer func() { _ = bucket.Close() }()
	for _, ref := range refs {
		r, err := bucket.NewReader(ctx, s.repos.Attachments.GetScopedPath(ref.path), nil)
		if err != nil {
			return fmt.Errorf("read attachment %s: %w", ref.id, err)
		}
		w, err := zw.Create(instanceAttachmentsDir + ref.id)
		if err != nil {
			_ = r.Close()
			return err
		}
		if _, err := io.Copy(w, r); err != nil {
			_ = r.Close()
			return err
		}
		_ = r.Close()
	}
	return nil
}

// RestoreInstanceBackup replaces persistent application data with a complete
// instance backup. IDs are preserved so every cross-collection/user relation
// remains intact. Authentication sessions are intentionally invalidated by the
// user replacement; the administrator signs in again with the restored account.
func (s *ExportService) RestoreInstanceBackup(ctx context.Context, file *os.File, size int64) error {
	zr, err := zip.NewReader(file, size)
	if err != nil {
		return fmt.Errorf("open instance backup: %w", err)
	}
	if err := enforceZipUncompressedLimit(zr, size); err != nil {
		return err
	}
	var manifest instanceBackupManifest
	found := false
	for _, f := range zr.File {
		if f.Name != instanceManifestFile {
			continue
		}
		r, err := f.Open()
		if err != nil {
			return err
		}
		err = json.NewDecoder(r).Decode(&manifest)
		_ = r.Close()
		if err != nil {
			return err
		}
		found = true
		break
	}
	if !found {
		return errors.New("instance-manifest.json missing")
	}
	if manifest.SchemaVersion != InstanceBackupSchemaVersion {
		return fmt.Errorf("unsupported instance backup schema %d", manifest.SchemaVersion)
	}

	tableRows := make(map[string][]map[string]any, len(instanceBackupTables))
	for _, table := range instanceBackupTables {
		rows, err := readTableJSON(zr, "tables/"+table+".json")
		if err != nil {
			return fmt.Errorf("read %s: %w", table, err)
		}
		tableRows[table] = rows
	}

	tx, err := s.db.Sql().BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// Remove current state in reverse dependency order. exports/auth tokens are
	// cleared first because they reference users/groups but are not restored.
	for _, table := range []string{"exports", "password_reset_tokens", "auth_tokens"} {
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+table); err != nil && !strings.Contains(strings.ToLower(err.Error()), "no such table") {
			return fmt.Errorf("clear %s: %w", table, err)
		}
	}
	for i := len(instanceBackupTables) - 1; i >= 0; i-- {
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+instanceBackupTables[i]); err != nil {
			return fmt.Errorf("clear %s: %w", instanceBackupTables[i], err)
		}
	}

	type patch struct{ table, col, id string; value any }
	var patches []patch
	for _, table := range instanceBackupTables {
		boolCols, err := boolColumns(ctx, tx, s.dialect, table)
		if err != nil {
			return err
		}
		for _, row := range tableRows[table] {
			if err := coerceBoolColumns(row, boolCols); err != nil {
				return fmt.Errorf("restore %s: %w", table, err)
			}
			for _, col := range instanceDeferredColumns[table] {
				if v, ok := row[col]; ok && v != nil && fmt.Sprint(v) != "" {
					id := fmt.Sprint(row["id"])
					patches = append(patches, patch{table: table, col: col, id: id, value: v})
					row[col] = nil
				}
			}
			if err := insertRow(ctx, tx, s.dialect, table, row); err != nil {
				return fmt.Errorf("restore %s: %w", table, err)
			}
		}
	}
	for _, p := range patches {
		q := fmt.Sprintf("UPDATE %s SET %s = %s WHERE id = %s",
			quoteIdent(s.dialect, p.table), quoteIdent(s.dialect, p.col),
			placeholder(s.dialect, 1), placeholder(s.dialect, 2))
		if _, err := tx.ExecContext(ctx, q, p.value, p.id); err != nil {
			return fmt.Errorf("restore deferred %s.%s: %w", p.table, p.col, err)
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}

	// Database is authoritative. Restore blobs only after the transaction has
	// committed; a blob error is returned loudly rather than silently producing
	// attachment rows without files.
	bucket, err := blob.OpenBucket(ctx, s.repos.Attachments.GetScopedConnString())
	if err != nil {
		return err
	}
	defer func() { _ = bucket.Close() }()
	for _, zf := range zr.File {
		if !strings.HasPrefix(zf.Name, instanceAttachmentsDir) || zf.FileInfo().IsDir() {
			continue
		}
		id := strings.TrimPrefix(zf.Name, instanceAttachmentsDir)
		var pathValue string
		q := "SELECT path FROM attachments WHERE id = " + placeholder(s.dialect, 1)
		if err := s.db.Sql().QueryRowContext(ctx, q, id).Scan(&pathValue); err != nil {
			return fmt.Errorf("resolve attachment %s: %w", id, err)
		}
		r, err := zf.Open()
		if err != nil {
			return err
		}
		w, err := bucket.NewWriter(ctx, s.repos.Attachments.GetScopedPath(pathValue), nil)
		if err != nil {
			_ = r.Close()
			return err
		}
		_, copyErr := io.Copy(w, r)
		closeErr := w.Close()
		_ = r.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}
