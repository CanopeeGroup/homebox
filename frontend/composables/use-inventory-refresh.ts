import type { TreeItem } from "~~/lib/api/types/data-contracts";

let inventoryRefreshPromise: Promise<void> | null = null;
let entityRefreshPromise: Promise<void> | null = null;

function treeStructureSignature(tree: TreeItem[] | null): string {
  if (!tree) return "";

  const entries: string[] = [];
  const walk = (nodes: TreeItem[], parentId = "") => {
    for (const node of nodes) {
      if (node.type !== "location") continue;
      entries.push(`${parentId}|${node.id}|${node.name}`);
      walk(node.children ?? [], node.id);
    }
  };

  walk(tree);
  entries.sort();
  return entries.join("\n");
}

export function useInventoryRefresh() {
  const locationStore = useLocationStore();
  const nuxtApp = useNuxtApp();
  const { cache: locationItemCache } = useLocationItemCache();
  const { cache: childLocationCache } = useLocationChildCache();
  const locationDetailCache = useState<Record<string, unknown>>("location-detail-cache", () => ({}));

  async function clearLocationPageCaches() {
    locationItemCache.value = {};
    childLocationCache.value = {};
    locationDetailCache.value = {};

    await Promise.all([
      deletePersistentCachePrefix(persistentCacheKey("location-detail:")),
      deletePersistentCachePrefix(persistentCacheKey("location-children:")),
      deletePersistentCachePrefix(persistentCacheKey("location-items:")),
    ]);
  }

  async function refreshMountedData() {
    try {
      await nuxtApp.runWithContext(() => refreshNuxtData());
    } catch (error) {
      console.error("Inventory page refresh failed after cache invalidation", error);
    }
  }

  async function refreshEntityData() {
    if (inventoryRefreshPromise) return inventoryRefreshPromise;
    if (entityRefreshPromise) return entityRefreshPromise;

    entityRefreshPromise = (async () => {
      const beforeStructure = treeStructureSignature(locationStore.tree);
      const treeResult = await locationStore.refreshTree(true);
      const afterStructure = treeStructureSignature(locationStore.tree);

      // A location create/delete/rename/move changes the structural signature.
      // Per-location caches are then unsafe: a deleted child can otherwise remain
      // visible in IndexedDB on another desktop/mobile client for up to 24 hours.
      if (!treeResult.error && beforeStructure !== afterStructure) {
        await clearLocationPageCaches();
        await Promise.allSettled([
          locationStore.refreshChildren(),
          locationStore.refreshParents(),
        ]);
      }

      await refreshMountedData();
    })().finally(() => {
      entityRefreshPromise = null;
    });

    return entityRefreshPromise;
  }

  async function refreshInventoryData() {
    if (inventoryRefreshPromise) return inventoryRefreshPromise;

    inventoryRefreshPromise = (async () => {
      // An import can create locations, move/update items and change quantities.
      // Drop every location-specific memory/IndexedDB cache before asking the
      // authoritative API for fresh state. This also fixes mobile/PWA clients
      // that may have missed the WebSocket event while suspended.
      await clearLocationPageCaches();

      await Promise.all([
        deletePersistentCache(persistentCacheKey("location-tree")),
        deletePersistentCache(persistentCacheKey("location-parents")),
        deletePersistentCache(persistentCacheKey("locations")),
      ]);

      // Refresh all location representations used by desktop and touch layouts.
      await Promise.allSettled([
        locationStore.refreshTree(true),
        locationStore.refreshChildren(),
        locationStore.refreshParents(),
      ]);

      // Refresh the currently mounted page only after stale caches are gone.
      await refreshMountedData();
    })().finally(() => {
      inventoryRefreshPromise = null;
    });

    return inventoryRefreshPromise;
  }

  return { refreshEntityData, refreshInventoryData };
}
