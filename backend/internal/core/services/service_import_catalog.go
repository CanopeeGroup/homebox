package services

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services/reporting"
	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
)

type CSVReadError struct{ Err error }

func (e CSVReadError) Error() string { return fmt.Sprintf("invalid CSV: %v", e.Err) }
func (e CSVReadError) Unwrap() error { return e.Err }

type CSVModelIssue struct {
	Row       int    `json:"row"`
	Name      string `json:"name"`
	Reference string `json:"reference"`
	Location  string `json:"location"`
	Reason    string `json:"reason"`
}

type CSVModelIssues []CSVModelIssue

func (CSVModelIssues) Error() string { return "CSV rows require model corrections" }

func matchCSVModels(rows []reporting.ExportCSVRow, models []repo.EntityTemplateSummary, corrections map[int]uuid.UUID) error {
	byID := make(map[uuid.UUID]string)
	byReference := make(map[string][]string)
	for _, model := range models {
		ref := strings.TrimSpace(model.DefaultModelNumber)
		if ref != "" {
			byID[model.ID] = ref
			key := strings.ToLower(ref)
			byReference[key] = append(byReference[key], ref)
		}
	}

	var issues CSVModelIssues
	for i := range rows {
		row := &rows[i]
		if row.LocationOnly || (strings.TrimSpace(row.Name) == "" && len(row.Location) == 0) {
			continue
		}

		ref := strings.TrimSpace(row.ModelNumber)
		matches := byReference[strings.ToLower(ref)]
		reason := "unknown"
		if id, corrected := corrections[i+2]; corrected {
			if selected := byID[id]; selected != "" {
				row.ModelNumber = selected
				continue
			}
			reason = "unavailable"
		} else if len(matches) == 1 {
			row.ModelNumber = matches[0]
			continue
		} else if len(matches) > 1 {
			reason = "ambiguous"
		} else if ref == "" {
			reason = "missing"
		}
		issues = append(issues, CSVModelIssue{Row: i + 2, Name: row.Name, Reference: ref, Location: strings.Join(row.Location, " / "), Reason: reason})
	}
	if len(issues) > 0 {
		return issues
	}
	return nil
}
