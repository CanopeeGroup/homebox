package v1

import (
	"net/http"

	"github.com/hay-kot/httpkit/errchain"
	"github.com/hay-kot/httpkit/server"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
)

// HandleAuditLogsGetAll returns the 1,000 most recent changes in the current collection.
func (ctrl *V1Controller) HandleAuditLogsGetAll() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		auth := services.NewContext(r.Context())
		entries, err := ctrl.repo.AuditLogs.GetAll(r.Context(), auth.GID)
		if err != nil {
			return err
		}
		return server.JSON(w, http.StatusOK, entries)
	}
}
