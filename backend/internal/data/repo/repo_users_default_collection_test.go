package repo

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestAdminDefaultCollectionMembership(t *testing.T) {
	ctx := context.Background()
	u, err := tRepos.Users.Create(ctx, userFactory())
	require.NoError(t, err)
	t.Cleanup(func() { _ = tRepos.Users.Delete(ctx, u.ID) })
	g, err := tRepos.Groups.GroupCreate(ctx, "Assigned collection", uuid.Nil)
	require.NoError(t, err)
	data := AdminUserUpdate{Name: u.Name, Email: u.Email, IsSuperuser: u.IsSuperuser, DefaultGroupID: &g.ID}
	require.NoError(t, tRepos.Users.UpdateAdmin(ctx, u.ID, data, nil))
	updated, err := tRepos.Users.GetOneID(ctx, u.ID)
	require.NoError(t, err)
	require.Equal(t, g.ID, updated.DefaultGroupID)
	require.Contains(t, updated.GroupIDs, g.ID)
	require.Contains(t, updated.GroupIDs, u.DefaultGroupID)
	// Saving twice must neither duplicate membership nor grant ownership.
	require.NoError(t, tRepos.Users.UpdateAdmin(ctx, u.ID, data, nil))
	owner, err := tRepos.Groups.IsOwnerOf(ctx, u.ID, g.ID)
	require.NoError(t, err)
	require.False(t, owner)
	// A deleted or invalid collection must roll back the account changes.
	missing := uuid.New()
	data.DefaultGroupID = &missing
	data.Name = "Must not be saved"
	require.Error(t, tRepos.Users.UpdateAdmin(ctx, u.ID, data, nil))
	after, err := tRepos.Users.GetOneID(ctx, u.ID)
	require.NoError(t, err)
	require.Equal(t, updated.Name, after.Name)
	require.Equal(t, g.ID, after.DefaultGroupID)
}
