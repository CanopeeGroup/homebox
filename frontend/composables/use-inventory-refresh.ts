let inventoryRefreshPromise: Promise<void> | null = null;

export function useInventoryRefresh() {
  const locationStore = useLocationStore();
  const nuxtApp = useNuxtApp();
  const { invalidate: invalidateLocationItems } = useLocationItemCache();
  const { invalidate: invalidateChildLocations } = useLocationChildCache();
  const locationDetailCache = useState<Record<string, unknown>>("location-detail-cache", () => ({}));

  async function refreshInventoryData() {
    if (inventoryRefreshPromise) return inventoryRefreshPromise;

    inventoryRefreshPromise = (async () => {
      // An import can create locations, move/update items and change quantities.
      // Drop every location-specific memory/IndexedDB cache before asking the
      // authoritative API for fresh state. This also fixes mobile/PWA clients
      // that may have missed the WebSocket event while suspended.
      invalidateLocationItems();
      invalidateChildLocations();
      locationDetailCache.value = {};

      await Promise.all([
        deletePersistentCache(persistentCacheKey("location-tree")),
        deletePersistentCache(persistentCacheKey("location-parents")),
        deletePersistentCache(persistentCacheKey("locations")),
        deletePersistentCachePrefix(persistentCacheKey("location-detail:")),
        deletePersistentCachePrefix(persistentCacheKey("location-children:")),
        deletePersistentCachePrefix(persistentCacheKey("location-items:")),
      ]);

      // Refresh all location representations used by desktop and touch layouts.
      await Promise.allSettled([
        locationStore.refreshTree(true),
        locationStore.refreshChildren(),
        locationStore.refreshParents(),
      ]);

      // Refresh the currently mounted page (location item list, search results,
      // counters, etc.) only after the stale caches have been invalidated.
      // A page-specific refresh failure must not leave the import dialog stuck.
      try {
        await nuxtApp.runWithContext(() => refreshNuxtData());
      } catch (error) {
        console.error("Inventory page refresh failed after cache invalidation", error);
      }
    })().finally(() => {
      inventoryRefreshPromise = null;
    });

    return inventoryRefreshPromise;
  }

  return { refreshInventoryData };
}
