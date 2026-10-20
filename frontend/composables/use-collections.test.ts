import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCollections } from "./use-collections";

const state = vi.hoisted(() => ({
  user: { id: "user", defaultGroupId: "assigned", isSuperuser: false },
  prefs: { value: { collectionId: "other" as string | null } },
}));

vi.mock("~/composables/use-api", () => ({
  useUserApi: () => ({
    user: { self: async () => ({ data: { item: state.user } }) },
    group: {
      getAll: async () => ({
        data: [
          { id: "assigned", name: "Assigned" },
          { id: "other", name: "Other" },
        ],
      }),
    },
  }),
}));
vi.mock("~/composables/use-preferences", () => ({ useViewPreferences: () => state.prefs }));
vi.mock("#imports", () => ({ useRoute: () => ({ path: "/locations" }), navigateTo: vi.fn() }));

describe("assigned collections", () => {
  beforeEach(() => {
    state.user.isSuperuser = false;
    state.prefs.value.collectionId = "other";
    vi.stubGlobal("window", { location: { pathname: "/locations" } });
    vi.stubGlobal("useAuthContext", () => ({ user: state.user }));
  });

  it("replaces a standard user's stored selection with the assigned collection", async () => {
    const collections = useCollections();
    await collections.load();
    expect(collections.selectedId.value).toBe("assigned");
    expect(state.prefs.value.collectionId).toBe("assigned");
    collections.set("other");
    expect(collections.selectedId.value).toBe("assigned");
    expect(state.prefs.value.collectionId).toBe("assigned");
  });

  it("preserves administrator selection and allows switching", async () => {
    state.user.isSuperuser = true;
    const collections = useCollections();
    await collections.load();
    expect(collections.selectedId.value).toBe("other");
    collections.set("assigned");
    expect(state.prefs.value.collectionId).toBe("assigned");
  });

  it("does not choose another collection when the assigned collection is unavailable", async () => {
    const previous = state.user.defaultGroupId;
    state.user.defaultGroupId = "deleted";
    try {
      const collections = useCollections();
      await collections.load();
      expect(collections.selectedId.value).toBeNull();
      expect(state.prefs.value.collectionId).toBeNull();
    } finally {
      state.user.defaultGroupId = previous;
    }
  });
});
