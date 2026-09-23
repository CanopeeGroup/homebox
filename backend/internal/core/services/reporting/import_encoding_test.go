package reporting

import (
	"bytes"
	"testing"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

func TestReadCompactCSVWindows1252(t *testing.T) {
	source := "Subfolder-level1;Subfolder-level2;Subfolder-level3;HB.name;HB.model_number;HB.quantity\n_NEGOCES;ARM N°1;ARM N°1-1;;;\n"
	encoded, _, err := transform.Bytes(charmap.Windows1252.NewEncoder(), []byte(source))
	if err != nil {
		t.Fatal(err)
	}

	var sheet IOSheet
	if err := sheet.Read(bytes.NewReader(encoded)); err != nil {
		t.Fatal(err)
	}
	if got := sheet.Rows[0].Location[1]; got != "ARM N°1" {
		t.Fatalf("Windows-1252 location was not decoded: %q", got)
	}
}

func TestReadCompactCSVUTF8BOM(t *testing.T) {
	source := append([]byte{0xEF, 0xBB, 0xBF}, []byte("Subfolder-level1;Subfolder-level2;Subfolder-level3;HB.name;HB.model_number;HB.quantity\nA;B;C;;;\n")...)
	var sheet IOSheet
	if err := sheet.Read(bytes.NewReader(source)); err != nil {
		t.Fatal(err)
	}
	if len(sheet.Rows[0].Location) != 3 || sheet.Rows[0].Location[2] != "C" {
		t.Fatalf("UTF-8 BOM import failed: %+v", sheet.Rows[0])
	}
}
