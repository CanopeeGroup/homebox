package v1

import (
	"net/http"
	"strconv"

	"github.com/hay-kot/httpkit/errchain"
	"github.com/hay-kot/httpkit/server"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
)

type AuditLogPage struct {
	Items      []repo.AuditLogEntry `json:"items"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"pageSize"`
	Total      int                  `json:"total"`
	TotalPages int                  `json:"totalPages"`
}

// HandleAuditLogsGetAll returns one page of the complete journal.
func (ctrl *V1Controller) HandleAuditLogsGetAll() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		if page < 1 {
			page = 1
		}
		pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
		if pageSize < 1 || pageSize > 1000 {
			pageSize = 1000
		}
		auth := services.NewContext(r.Context())
		total, err := ctrl.repo.AuditLogs.Count(r.Context(), auth.GID)
		if err != nil {
			return err
		}
		entries, err := ctrl.repo.AuditLogs.GetPage(r.Context(), auth.GID, pageSize, (page-1)*pageSize)
		if err != nil {
			return err
		}
		totalPages := (total + pageSize - 1) / pageSize
		return server.JSON(w, http.StatusOK, AuditLogPage{
			Items: entries, Page: page, PageSize: pageSize, Total: total, TotalPages: totalPages,
		})
	}
}
