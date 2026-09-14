package reporting

import (
	"strings"
	"testing"
)

func TestCompactCSV(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{
		{IsLocation: true, Name: "A0110", FolderPath: LocationString{"A", "A0110"}},
		{Name: "Object", ModelNumber: "REF", Quantity: 0, FolderPath: LocationString{"A", "A0110"}},
	}}
	rows, err := sheet.CompactCSV()
	if err != nil { t.Fatal(err) }
	if len(rows) != 2 || len(rows[0]) != 5 || rows[1][2] != "Object" || rows[1][4] != "0" { t.Fatalf("unexpected export: %+v", rows) }
	var imported IOSheet
	if err := imported.Read(strings.NewReader("Subfolder-level1;Subfolder-level2;HB.name;HB.model_number;HB.quantity\nA;A0110;;;\nA;A0110;Object;REF;0\n")); err != nil { t.Fatal(err) }
	if !imported.Rows[0].LocationOnly || imported.Rows[1].LocationOnly || imported.Rows[1].ModelNumber != "REF" { t.Fatalf("unexpected import: %+v", imported.Rows) }
}

func TestCompactCSVRejectsDeepLocations(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{{FolderPath: LocationString{"A", "B", "C"}}}}
	if _, err := sheet.CompactCSV(); err == nil { t.Fatal("deeper hierarchy silently lost") }
}

func TestCompactCSVOnlyEmptyLeafLocations(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{
		{IsLocation: true, FolderPath: LocationString{"A1"}},
		{IsLocation: true, FolderPath: LocationString{"A1", "A1001"}},
		{IsLocation: true, FolderPath: LocationString{"A1", "A1002"}},
		{IsLocation: true, FolderPath: LocationString{"A1", "A1002"}},
		{Name: "1012 ANGE FONTE OR", ModelNumber: "P1012OR", Quantity: 2, FolderPath: LocationString{"A1", "A1001"}},
		{Name: "1030 EXPORT ZAMAC VB", ModelNumber: "P1030VB", Quantity: 5, FolderPath: LocationString{"A1", "A1001"}},
		{IsLocation: true, FolderPath: LocationString{"EmptyRoot"}},
	}}
	rows, err := sheet.CompactCSV()
	if err != nil { t.Fatal(err) }
	if len(rows) != 5 { t.Fatalf("expected header, empty leaf, two objects and empty root: %+v", rows) }
	if rows[1][1] != "A1002" || rows[1][2] != "" { t.Fatalf("empty location missing: %+v", rows) }
	if rows[2][2] != "1012 ANGE FONTE OR" || rows[3][2] != "1030 EXPORT ZAMAC VB" { t.Fatal("objects lost") }
	if rows[4][0] != "EmptyRoot" || rows[4][2] != "" { t.Fatal("empty root lost") }
}
