import type { EntitySummary } from "~~/lib/api/types/data-contracts";

export function useLocationChildCache() {
  const cache = useState<Record<string, EntitySummary[]>>("location-child-cache", () => ({}));

  function adjustItemCount(locationId: string, delta: number) {
    for (const [parentLocationId, locations] of Object.entries(cache.value)) {
      const cachedLocation = locations.find(location => location.id === locationId);
      if (cachedLocation) {
        cachedLocation.itemCount = Math.max(0, (cachedLocation.itemCount ?? 0) + delta);
        void writePersistentCache(persistentCacheKey(`location-children:${parentLocationId}`), locations);
      }
    }
  }

  function invalidate(parentLocationId?: string) {
    if (parentLocationId) {
      delete cache.value[parentLocationId];
      void deletePersistentCache(persistentCacheKey(`location-children:${parentLocationId}`));
      return;
    }

    for (const id of Object.keys(cache.value)) {
      void deletePersistentCache(persistentCacheKey(`location-children:${id}`));
    }
    cache.value = {};
  }

  return {
    cache,
    adjustItemCount,
    invalidate,
  };
}
