package v1

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/hay-kot/httpkit/errchain"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/validate"
)

// HandleBillOfMaterialsExport godoc
//
//	@Summary	Export Bill of Materials
//	@Tags		Reporting
//	@Produce	json
//	@Success	200	{string}	string	"text/csv"
//	@Router		/v1/reporting/bill-of-materials [GET]
//	@Security	Bearer
func (ctrl *V1Controller) HandleBillOfMaterialsExport() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		tenant := services.UseTenantCtx(r.Context())

		if tenant == uuid.Nil {
			return validate.NewRequestError(errors.New("tenant required"), http.StatusBadRequest)
		}

		csv, err := ctrl.svc.Entities.ExportBillOfMaterialsCSV(r.Context(), tenant)
		if err != nil {
			return err
		}

		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", "attachment; filename=bill-of-materials.csv")
		_, err = w.Write(csv)
		return err
	}
}

// HandleInventoryPivotExport godoc
//
//	@Summary	Export inventory quantities by model number as an Excel pivot table
//	@Tags		Reporting
//	@Produce	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
//	@Success	200	{file}		file
//	@Router		/v1/reporting/inventory-pivot [GET]
//	@Security	Bearer
func (ctrl *V1Controller) HandleInventoryPivotExport() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		tenant := services.UseTenantCtx(r.Context())

		if tenant == uuid.Nil {
			return validate.NewRequestError(errors.New("tenant required"), http.StatusBadRequest)
		}

		xlsx, err := ctrl.svc.Entities.ExportInventoryPivotXLSX(r.Context(), tenant)
		if err != nil {
			return err
		}

		w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		w.Header().Set("Content-Disposition", "attachment; filename=homebox-inventaire-tableau-croise.xlsx")
		_, err = w.Write(xlsx)
		return err
	}
}
