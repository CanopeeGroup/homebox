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
	if len(rows[0]) != 5 || rows[1][2] != "" || rows[2][2] != "Object" || rows[2][4] != "0" { t.Fatalf("unexpected export: %+v", rows) }
	var imported IOSheet
	if err := imported.Read(strings.NewReader("Subfolder-level1;Subfolder-level2;HB.name;HB.model_number;HB.quantity\nA;A0110;;;\nA;A0110;Object;REF;0\n")); err != nil { t.Fatal(err) }
	if !imported.Rows[0].LocationOnly || imported.Rows[1].LocationOnly || imported.Rows[1].ModelNumber != "REF" { t.Fatalf("unexpected import: %+v", imported.Rows) }
}

func TestCompactCSVRejectsDeepLocations(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{{FolderPath: LocationString{"A", "B", "C"}}}}
	if _, err := sheet.CompactCSV(); err == nil { t.Fatal("deeper hierarchy silently lost") }
}
