package reporting

import (
	"bytes"
	"encoding/csv"
	"errors"
	"io"
	"strings"
	"unicode/utf8"

	"github.com/samber/lo"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/transform"
)

// Required column headers in CSV/TSV imports. Exported so tests and other
// packages share the same canonical strings.
const (
	HeaderHBLocation = "HB.location"
	HeaderHBName     = "HB.name"
)

var (
	ErrNoHomeboxHeaders       = errors.New("no headers found")
	ErrMissingRequiredHeaders = errors.New("missing required headers `" + HeaderHBLocation + "` or `" + HeaderHBName + "`")
)

// determineSeparator determines the separator used in the CSV file
// It returns the separator as a rune and an error if it could not be determined
//
// It is assumed that the first row is the header row and that the separator is the same
// for all rows.
//
// Supported separators are comma, tab and semicolon
func determineSeparator(data []byte) (rune, error) {
	// First row
	firstRow := bytes.Split(data, []byte("\n"))[0]

	// Compare parsed header widths, respecting quoted separators.
	best, width := rune(0), 0
	for _, separator := range []rune{',', '\t', ';'} {
		reader := csv.NewReader(bytes.NewReader(firstRow))
		reader.Comma = separator
		header, err := reader.Read()
		if err == nil && len(header) > width {
			best, width = separator, len(header)
		}
	}
	if width < 2 {
		return 0, errors.New("could not determine separator")
	}
	return best, nil
}

// readRawCsv reads a CSV file and returns the raw data as a 2D string array
// It determines the separator used in the CSV file and returns an error if
// it could not be determined
func readRawCsv(r io.Reader) ([][]string, error) {
	// Read once so encoding detection applies to the whole file, not only the
	// header. Excel exports in French environments are frequently Windows-1252.
	raw, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}

	data := raw
	if !utf8.Valid(data) {
		decoded, _, decodeErr := transform.Bytes(charmap.Windows1252.NewDecoder(), data)
		if decodeErr != nil {
			return nil, fmt.Errorf("could not decode CSV as UTF-8 or Windows-1252: %w", decodeErr)
		}
		data = decoded
	}

	// Strip an optional UTF-8 BOM before separator/header parsing.
	data = bytes.TrimPrefix(data, []byte{0xEF, 0xBB, 0xBF})

	sep, err := determineSeparator(data)
	if err != nil {
		return nil, err
	}

	reader := csv.NewReader(bytes.NewReader(data))
	reader.Comma = sep
	return reader.ReadAll()
}

// parseHeaders parses the homebox headers from the CSV file and returns a map of the headers
// and their column index as well as a list of the field headers (HB.field.*) in the order
// they appear in the CSV file
//
// It returns an error if no homebox headers are found
func parseHeaders(headers []string) (hbHeaders map[string]int, fieldHeaders []string, err error) {
	hbHeaders = map[string]int{} // initialize map

	for col, h := range headers {
		if strings.HasPrefix(h, "HB.field.") {
			fieldHeaders = append(fieldHeaders, h)
		}

		if strings.HasPrefix(h, "HB.") {
			hbHeaders[h] = col
		}
	}

	required := []string{HeaderHBLocation, HeaderHBName}
	if !lo.EveryBy(required, func(h string) bool {
		return lo.HasKey(hbHeaders, h)
	}) {
		return nil, nil, ErrMissingRequiredHeaders
	}

	if len(hbHeaders) == 0 {
		return nil, nil, ErrNoHomeboxHeaders
	}

	return hbHeaders, fieldHeaders, nil
}
