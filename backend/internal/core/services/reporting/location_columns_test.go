package reporting

import (
	"strings"
	"testing"
)

func TestLocationColumns(t *testing.T) {
	var sheet IOSheet
	if err := sheet.Read(strings.NewReader("\uFEFFSubfolder-level1;Subfolder-level2\n;\nA;A0110\nA;A0120\nA;A0120\n")); err != nil { t.Fatal(err) }
	if len(sheet.Rows) != 4 { t.Fatalf("rows: %d", len(sheet.Rows)) }
	for _, row := range sheet.Rows[1:] {
		if !row.LocationOnly || row.Name != "" || len(row.Location) != 2 || row.Location[0] != "A" { t.Fatalf("unexpected row: %+v", row) }
	}
	if err := sheet.Read(strings.NewReader("Subfolder-level1;Subfolder-level2\n;child\n")); err == nil { t.Fatal("missing parent accepted") }
}

func TestLegacyLocationColumns(t *testing.T) {
	var sheet IOSheet
	if err := sheet.Read(strings.NewReader("HB.name,HB.location\nObject,A / child\n")); err != nil { t.Fatal(err) }
	if sheet.Rows[0].LocationOnly || sheet.Rows[0].Name != "Object" { t.Fatal("legacy object changed") }
}


func TestLocationColumnsAcceptRootInSecondLevel(t *testing.T) {
	var sheet IOSheet
	if err := sheet.Read(strings.NewReader("Subfolder-level1,Subfolder-level2,HB.name,HB.model_number,HB.quantity\n,Avant A,,,\nA,A0110,,,\n")); err != nil { t.Fatal(err) }
	if len(sheet.Rows) != 2 { t.Fatalf("rows: %d", len(sheet.Rows)) }
	if !sheet.Rows[0].LocationOnly || len(sheet.Rows[0].Location) != 1 || sheet.Rows[0].Location[0] != "Avant A" {
		t.Fatalf("root location in second level not normalized: %+v", sheet.Rows[0])
	}
	if len(sheet.Rows[1].Location) != 2 || sheet.Rows[1].Location[0] != "A" || sheet.Rows[1].Location[1] != "A0110" {
		t.Fatalf("normal nested location changed: %+v", sheet.Rows[1])
	}
}
