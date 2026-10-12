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
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || len(rows[0]) != 7 || rows[0][3] != "Subfolder-level4" || rows[1][4] != "Object" || rows[1][6] != "0" {
		t.Fatalf("unexpected export: %+v", rows)
	}

	var imported IOSheet
	if err := imported.Read(strings.NewReader(
		"Subfolder-level1;Subfolder-level2;Subfolder-level3;Subfolder-level4;HB.name;HB.model_number;HB.quantity\n" +
			"A;A0110;;;;;\n" +
			"A;A0110;;;Object;REF;0\n",
	)); err != nil {
		t.Fatal(err)
	}
	if !imported.Rows[0].LocationOnly || imported.Rows[1].LocationOnly || imported.Rows[1].ModelNumber != "REF" {
		t.Fatalf("unexpected import: %+v", imported.Rows)
	}
}

func TestCompactCSVThirdLevelLocations(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{
		{IsLocation: true, FolderPath: LocationString{"A", "B", "C"}},
		{Name: "Object", ModelNumber: "REF", Quantity: 1, FolderPath: LocationString{"A", "B", "C"}},
	}}

	rows, err := sheet.CompactCSV()
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || rows[1][0] != "A" || rows[1][1] != "B" || rows[1][2] != "C" || rows[1][4] != "Object" {
		t.Fatalf("unexpected level-3 export: %+v", rows)
	}

	var imported IOSheet
	if err := imported.Read(strings.NewReader(
		"Subfolder-level1;Subfolder-level2;Subfolder-level3;HB.name;HB.model_number;HB.quantity\n" +
			"A;B;C;Object;REF;1\n",
	)); err != nil {
		t.Fatal(err)
	}
	if len(imported.Rows[0].Location) != 3 || imported.Rows[0].Location[2] != "C" {
		t.Fatalf("level-3 import lost: %+v", imported.Rows[0])
	}
}

func TestCompactCSVFourthLevelLocations(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{
		{IsLocation: true, FolderPath: LocationString{"A", "B", "C", "D"}},
		{Name: "Object L4", ModelNumber: "REF-L4", Quantity: 2, FolderPath: LocationString{"A", "B", "C", "D"}},
	}}

	rows, err := sheet.CompactCSV()
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 || rows[1][0] != "A" || rows[1][1] != "B" || rows[1][2] != "C" || rows[1][3] != "D" || rows[1][4] != "Object L4" || rows[1][5] != "REF-L4" || rows[1][6] != "2" {
		t.Fatalf("unexpected level-4 export: %+v", rows)
	}

	var imported IOSheet
	if err := imported.Read(strings.NewReader(
		"Subfolder-level1;Subfolder-level2;Subfolder-level3;Subfolder-level4;HB.name;HB.model_number;HB.quantity\n" +
			"A;B;C;D;Object L4;REF-L4;2\n",
	)); err != nil {
		t.Fatal(err)
	}
	if len(imported.Rows[0].Location) != 4 || imported.Rows[0].Location[3] != "D" || imported.Rows[0].Name != "Object L4" {
		t.Fatalf("level-4 import lost: %+v", imported.Rows[0])
	}
}

func TestCompactCSVRejectsFifthLevelLocations(t *testing.T) {
	sheet := IOSheet{Rows: []ExportCSVRow{{FolderPath: LocationString{"A", "B", "C", "D", "E"}}}}
	if _, err := sheet.CompactCSV(); err == nil {
		t.Fatal("fifth location level silently lost")
	}
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
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 5 {
		t.Fatalf("expected header, empty leaf, two objects and empty root: %+v", rows)
	}
	if rows[1][1] != "A1002" || rows[1][4] != "" {
		t.Fatalf("empty location missing: %+v", rows)
	}
	if rows[2][4] != "1012 ANGE FONTE OR" || rows[3][4] != "1030 EXPORT ZAMAC VB" {
		t.Fatal("objects lost")
	}
	if rows[4][0] != "EmptyRoot" || rows[4][4] != "" {
		t.Fatal("empty root lost")
	}
}
