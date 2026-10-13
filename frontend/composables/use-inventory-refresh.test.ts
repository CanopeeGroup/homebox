import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useInventoryRefresh } from "./use-inventory-refresh";

const store = {
  tree: [] as unknown[] | null,
  parents: [] as unknown[] | null,
  Locations: [] as unknown[] | null,
  invalidateAllRequests: vi.fn(),
  refreshTree: vi.fn(),
  refreshChildren: vi.fn(),
  refreshParents: vi.fn(),
};
const caches = [ref({ old: [1] }), ref({ old: [2] }), ref({ old: [3] })];
const refreshNuxtData = vi.fn();
const clearNuxtData = vi.fn();
const clearPersistentCache = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  store.tree = [];
  store.parents = [];
  store.Locations = [];
  store.refreshTree.mockResolvedValue({ data: [] });
  store.refreshChildren.mockResolvedValue({ data: [] });
  store.refreshParents.mockResolvedValue({ data: [] });
  caches.forEach(cache => {
    cache.value = { old: [1] };
  });
  vi.stubGlobal("useLocationStore", () => store);
  vi.stubGlobal("useNuxtApp", () => ({ runWithContext: (fn: () => unknown) => fn() }));
  vi.stubGlobal("useLocationItemCache", () => ({ cache: caches[0] }));
  vi.stubGlobal("useLocationChildCache", () => ({ cache: caches[1] }));
  vi.stubGlobal("useState", () => caches[2]);
  vi.stubGlobal("useUserApi", () => ({}));
  vi.stubGlobal("useViewPreferences", () => ref({ collectionId: "a" }));
  vi.stubGlobal("useAuthContext", () => ({ attachmentToken: "token" }));
  vi.stubGlobal("persistentCacheKey", (key: string) => `a:${key}`);
  vi.stubGlobal("deletePersistentCache", vi.fn());
  vi.stubGlobal("deletePersistentCachePrefix", vi.fn());
  vi.stubGlobal("clearPersistentCache", clearPersistentCache);
  vi.stubGlobal("refreshNuxtData", refreshNuxtData);
  vi.stubGlobal("clearNuxtData", clearNuxtData);
});
afterEach(() => vi.unstubAllGlobals());

describe("authoritative inventory refresh", () => {
  it("purges every page cache, fetches every location representation, then refreshes mounted pages", async () => {
    await useInventoryRefresh().refreshInventoryData();
    expect(store.invalidateAllRequests).toHaveBeenCalledOnce();
    caches.forEach(cache => expect(cache.value).toEqual({}));
    expect(store.refreshTree).toHaveBeenCalledWith(true);
    expect(store.refreshChildren).toHaveBeenCalledWith(true);
    expect(store.refreshParents).toHaveBeenCalledWith(true);
    expect(refreshNuxtData).toHaveBeenCalledOnce();
    expect(clearNuxtData).not.toHaveBeenCalled();
    expect(store.refreshTree.mock.invocationCallOrder[0]).toBeLessThan(refreshNuxtData.mock.invocationCallOrder[0]);
  });

  it("does another refresh if import completion arrives during a refresh", async () => {
    let finish!: () => void;
    store.refreshTree.mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        })
    );
    const refresh = useInventoryRefresh().refreshInventoryData;
    const first = refresh();
    while (!finish) await Promise.resolve();
    const second = refresh();
    finish();
    await Promise.all([first, second]);
    expect(store.refreshTree).toHaveBeenCalledTimes(2);
    expect(refreshNuxtData).toHaveBeenCalledTimes(2);
  });

  it("clears all collections and resident state after a full instance restore", async () => {
    await useInventoryRefresh().clearInventoryData(true);
    expect(clearPersistentCache).toHaveBeenCalledOnce();
    expect(clearNuxtData).toHaveBeenCalledOnce();
    expect(store.tree).toBeNull();
    expect(store.parents).toBeNull();
    expect(store.Locations).toBeNull();
  });
});
