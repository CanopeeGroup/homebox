package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/hay-kot/httpkit/errchain"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
)

func TestTenantCollectionAssignment(t *testing.T) {
	assigned, other := uuid.New(), uuid.New()
	for _, tc := range []struct {
		name   string
		admin  bool
		header string
		query  string
		want   uuid.UUID
	}{
		{"standard default", false, "", "", assigned},
		{"standard stale header", false, other.String(), "", assigned},
		{"standard forged query", false, "", other.String(), assigned},
		{"administrator selection", true, other.String(), "", other},
		{"administrator query", true, "", other.String(), other},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodGet, "/?tenant="+tc.query, nil)
			r.Header.Set("X-Tenant", tc.header)
			u := repo.UserOut{ID: uuid.New(), IsSuperuser: tc.admin, DefaultGroupID: assigned, GroupIDs: []uuid.UUID{assigned, other}}
			r = r.WithContext(services.SetUserCtx(r.Context(), &u, "test"))
			called := false
			a := &app{}
			h := a.mwTenant(errchain.HandlerFunc(func(w http.ResponseWriter, r *http.Request) error {
				called = true
				if got := services.NewContext(r.Context()).GID; got != tc.want {
					t.Fatalf("collection = %s, want %s", got, tc.want)
				}
				return nil
			}))
			if err := h.ServeHTTP(httptest.NewRecorder(), r); err != nil {
				t.Fatal(err)
			}
			if !called {
				t.Fatal("request did not reach handler")
			}
		})
	}
}
