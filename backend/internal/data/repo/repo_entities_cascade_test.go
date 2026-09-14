package repo

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestDeleteLocationIncludesAllDescendants(t *testing.T) {
	ctx := context.Background()
	locationType := useContainerEntityType(t)
	itemType := useItemEntityType(t)
	create := func(name string, parent uuid.UUID, typeID uuid.UUID) EntityOut {
		t.Helper()
		e, err := tRepos.Entities.Create(ctx, tGroup.ID, EntityCreate{
			Name: name, ParentID: parent, EntityTypeID: typeID,
		})
		require.NoError(t, err)
		return e
	}
	root := create("cascade-root", uuid.Nil, locationType.ID)
	child := create("cascade-child", root.ID, locationType.ID)
	deep := create("cascade-deep", child.ID, locationType.ID)
	item := create("cascade-item", deep.ID, itemType.ID)
	nested := create("cascade-nested-item", item.ID, itemType.ID)
	direct := create("cascade-direct-item", root.ID, itemType.ID)
	unrelated := create("cascade-unrelated", uuid.Nil, locationType.ID)
	t.Cleanup(func() { _ = tRepos.Entities.DeleteByGroup(ctx, tGroup.ID, unrelated.ID) })

	// Another collection cannot delete the subtree.
	require.Error(t, tRepos.Entities.DeleteByGroup(ctx, uuid.New(), root.ID))
	_, err := tRepos.Entities.GetOneByGroup(ctx, tGroup.ID, item.ID)
	require.NoError(t, err)

	require.NoError(t, tRepos.Entities.DeleteByGroup(ctx, tGroup.ID, root.ID))
	for _, e := range []EntityOut{root, child, deep, item, nested, direct} {
		_, err := tRepos.Entities.GetOneByGroup(ctx, tGroup.ID, e.ID)
		require.Error(t, err)
	}
	_, err = tRepos.Entities.GetOneByGroup(ctx, tGroup.ID, unrelated.ID)
	require.NoError(t, err)
}
