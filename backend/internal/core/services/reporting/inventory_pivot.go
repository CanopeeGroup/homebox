package reporting

import (
	"fmt"
	"strings"

	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
	"github.com/xuri/excelize/v2"
)

const (
	inventorySheetName = "Inventaire"
	pivotSheetName     = "Tableau croisé"
)

// InventoryPivotXLSX builds an Excel workbook containing the inventory source
// data and a native pivot table that sums item quantities by model number.
func InventoryPivotXLSX(entities []repo.EntityOut) ([]byte, error) {
	workbook := excelize.NewFile()
	defer func() {
		_ = workbook.Close()
	}()

	if err := workbook.SetSheetName("Sheet1", inventorySheetName); err != nil {
		return nil, err
	}
	pivotSheetIndex, err := workbook.NewSheet(pivotSheetName)
	if err != nil {
		return nil, err
	}

	headers := []any{"Numéro de modèle", "Quantité"}
	if err = workbook.SetSheetRow(inventorySheetName, "A1", &headers); err != nil {
		return nil, err
	}

	row := 2
	for _, entity := range entities {
		if entity.EntityType != nil && entity.EntityType.IsLocation {
			continue
		}

		modelNumber := strings.TrimSpace(entity.ModelNumber)
		if modelNumber == "" {
			modelNumber = "(Sans numéro de modèle)"
		}

		if err = workbook.SetCellValue(inventorySheetName, fmt.Sprintf("A%d", row), modelNumber); err != nil {
			return nil, err
		}
		if err = workbook.SetCellValue(inventorySheetName, fmt.Sprintf("B%d", row), entity.Quantity); err != nil {
			return nil, err
		}
		row++
	}

	headerStyle, err := workbook.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"548064"}, Pattern: 1},
	})
	if err != nil {
		return nil, err
	}
	if err = workbook.SetCellStyle(inventorySheetName, "A1", "B1", headerStyle); err != nil {
		return nil, err
	}
	if err = workbook.SetColWidth(inventorySheetName, "A", "A", 32); err != nil {
		return nil, err
	}
	if err = workbook.SetColWidth(inventorySheetName, "B", "B", 14); err != nil {
		return nil, err
	}
	if err = workbook.SetPanes(inventorySheetName, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	}); err != nil {
		return nil, err
	}

	if err = workbook.SetCellValue(pivotSheetName, "A1", "Quantités par numéro de modèle"); err != nil {
		return nil, err
	}
	if err = workbook.SetCellStyle(pivotSheetName, "A1", "A1", headerStyle); err != nil {
		return nil, err
	}
	if err = workbook.SetColWidth(pivotSheetName, "A", "A", 32); err != nil {
		return nil, err
	}
	if err = workbook.SetColWidth(pivotSheetName, "B", "C", 18); err != nil {
		return nil, err
	}

	if row == 2 {
		if err = workbook.SetCellValue(pivotSheetName, "A3", "Aucun objet dans l’inventaire."); err != nil {
			return nil, err
		}
	} else {
		lastDataRow := row - 1
		pivotLastRow := lastDataRow + 10
		if err = workbook.AddPivotTable(&excelize.PivotTableOptions{
			DataRange:       fmt.Sprintf("%s!A1:B%d", inventorySheetName, lastDataRow),
			PivotTableRange: fmt.Sprintf("%s!A3:C%d", pivotSheetName, pivotLastRow),
			Name:            "QuantitesParModele",
			Rows: []excelize.PivotTableField{
				{Data: "Numéro de modèle", ShowAll: true},
			},
			Data: []excelize.PivotTableField{
				{Data: "Quantité", Name: "Somme de Quantité", Subtotal: "Sum"},
			},
			RowGrandTotals:      true,
			ColGrandTotals:      true,
			ShowDrill:           true,
			ShowRowHeaders:      true,
			ShowColHeaders:      true,
			ShowRowStripes:      true,
			PivotTableStyleName: "PivotStyleMedium9",
		}); err != nil {
			return nil, err
		}
	}

	workbook.SetActiveSheet(pivotSheetIndex)
	buffer, err := workbook.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
