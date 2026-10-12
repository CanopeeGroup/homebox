package services

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
)

// TestEntityService_CsvImport_AssetIDIdempotent verifies that re-importing the
// same CSV file (rows matched by their existing import ref) does not consume a
// new auto-incremented asset ID on every run.
//
// Regression test for https://github.com/sysadminsmedia/homebox/issues/1100
// ("Importing a File with import_ref increments asset-id"): the first import
// assigns an asset ID, and subsequent imports of the unchanged file must leave
// that asset ID untouched.
func TestEntityService_CsvImport_AssetIDIdempotent(t *testing.T) {
	ctx := context.Background()

	grp, err := tRepos.Groups.GroupCreate(ctx, "csv-assetid-"+fk.Str(4), uuid.Nil)
	require.NoError(t, err)

	csv := "HB.import_ref,HB.location,HB.name,HB.quantity\n" +
		"ref-1,Loc A,Widget,1\n"

	// First import: creates the item and assigns an auto-incremented asset ID.
	n, err := tSvc.Entities.CsvImport(ctx, grp.ID, strings.NewReader(csv))
	require.NoError(t, err)
	require.Equal(t, 1, n)

	first, err := tRepos.Entities.GetByRef(ctx, grp.ID, "ref-1")
	require.NoError(t, err)
	require.False(t, first.AssetID.Nil(), "first import should assign an asset ID")

	// Re-import the exact same file. The row is matched by its import ref and
	// updated in place, so the asset ID must remain stable.
	n, err = tSvc.Entities.CsvImport(ctx, grp.ID, strings.NewReader(csv))
	require.NoError(t, err)
	require.Equal(t, 1, n)

	second, err := tRepos.Entities.GetByRef(ctx, grp.ID, "ref-1")
	require.NoError(t, err)

	require.Equal(t, second.ID, first.ID, "re-import must update the same entity")
	require.Equal(t, first.AssetID, second.AssetID, "re-import must not change the asset ID")
}

// TestEntityService_CsvImport_AssetIDAutoIncrement guards the auto-increment
// path that issue #1100's fix must preserve: genuinely new items imported in a
// single file still receive distinct, sequential asset IDs.
func TestEntityService_CsvImport_AssetIDAutoIncrement(t *testing.T) {
	ctx := context.Background()

	grp, err := tRepos.Groups.GroupCreate(ctx, "csv-assetid-inc-"+fk.Str(4), uuid.Nil)
	require.NoError(t, err)

	csv := "HB.import_ref,HB.location,HB.name,HB.quantity\n" +
		"ref-a,Loc A,Widget A,1\n" +
		"ref-b,Loc A,Widget B,1\n"

	n, err := tSvc.Entities.CsvImport(ctx, grp.ID, strings.NewReader(csv))
	require.NoError(t, err)
	require.Equal(t, 2, n)

	a, err := tRepos.Entities.GetByRef(ctx, grp.ID, "ref-a")
	require.NoError(t, err)
	b, err := tRepos.Entities.GetByRef(ctx, grp.ID, "ref-b")
	require.NoError(t, err)

	require.False(t, a.AssetID.Nil())
	require.False(t, b.AssetID.Nil())
	require.NotEqual(t, a.AssetID, b.AssetID, "distinct new items must get distinct asset IDs")
}


func TestEntityService_CsvImport_FourthLevelObject(t *testing.T) {
	ctx := context.Background()

	grp, err := tRepos.Groups.GroupCreate(ctx, "csv-level4-"+fk.Str(4), uuid.Nil)
	require.NoError(t, err)

	csv := "Subfolder-level1;Subfolder-level2;Subfolder-level3;Subfolder-level4;HB.name;HB.model_number;HB.quantity\n" +
		"A;B;C;D;Object L4;REF-L4;3\n"

	n, err := tSvc.Entities.CsvImport(ctx, grp.ID, strings.NewReader(csv))
	require.NoError(t, err)
	require.Equal(t, 1, n)

	entities, err := tRepos.Entities.GetAll(ctx, grp.ID)
	require.NoError(t, err)

	byName := make(map[string]repo.EntityOut, len(entities))
	for _, entity := range entities {
		byName[entity.Name] = entity
	}

	item, ok := byName["Object L4"]
	require.True(t, ok, "level-4 object was not created")
	require.NotNil(t, item.Parent)
	require.Equal(t, "D", item.Parent.Name)
	require.Equal(t, float64(3), item.Quantity)
	require.Equal(t, "REF-L4", item.ModelNumber)

	level4, ok := byName["D"]
	require.True(t, ok, "level-4 location was not created")
	require.NotNil(t, level4.Parent)
	require.Equal(t, "C", level4.Parent.Name)

	level3, ok := byName["C"]
	require.True(t, ok)
	require.NotNil(t, level3.Parent)
	require.Equal(t, "B", level3.Parent.Name)

	level2, ok := byName["B"]
	require.True(t, ok)
	require.NotNil(t, level2.Parent)
	require.Equal(t, "A", level2.Parent.Name)
}
