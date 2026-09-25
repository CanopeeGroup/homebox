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

	// A fresh tree query must not resurrect the deleted location from server
	// state; only the unrelated location should remain.
	tree, err := tRepos.Entities.Tree(ctx, tGroup.ID, TreeQuery{WithItems: false})
	require.NoError(t, err)
	require.NotContains(t, collectTreeIDs(tree), root.ID)
	require.Contains(t, collectTreeIDs(tree), unrelated.ID)

	_, err = tRepos.Entities.GetOneByGroup(ctx, tGroup.ID, unrelated.ID)
	require.NoError(t, err)
}

func collectTreeIDs(tree []TreeItem) []uuid.UUID {
	ids := make([]uuid.UUID, 0)
	var walk func([]TreeItem)
	walk = func(nodes []TreeItem) {
		for _, node := range nodes {
			ids = append(ids, node.ID)
			children := make([]TreeItem, 0, len(node.Children))
			for _, child := range node.Children {
				children = append(children, *child)
			}
			walk(children)
		}
	}
	walk(tree)
	return ids
}
