import type { EntitySummary } from "~~/lib/api/types/data-contracts";

export function useLocationItemCache() {
  const cache = useState<Record<string, EntitySummary[]>>("location-item-cache", () => ({}));

  function updateQuantity(itemId: string, quantity: number) {
    for (const [locationId, items] of Object.entries(cache.value)) {
      const cachedItem = items.find(item => item.id === itemId);
      if (cachedItem) {
        cachedItem.quantity = quantity;
        void writePersistentCache(persistentCacheKey(`location-items:${locationId}`), items);
      }
    }
  }

  function removeLocations(locationIds: string[]) {
    for (const locationId of locationIds) {
      delete cache.value[locationId];
      void deletePersistentCache(persistentCacheKey(`location-items:${locationId}`));
    }
  }

  function invalidate(locationId?: string) {
    if (locationId) {
      delete cache.value[locationId];
      void deletePersistentCache(persistentCacheKey(`location-items:${locationId}`));
      return;
    }

    for (const id of Object.keys(cache.value)) {
      void deletePersistentCache(persistentCacheKey(`location-items:${id}`));
    }
    cache.value = {};
  }

  return {
    cache,
    updateQuantity,
    removeLocations,
    invalidate,
  };
}
