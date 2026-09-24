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

  function removeLocations(locationIds: string[]) {
    const ids = new Set(locationIds);

    for (const [parentLocationId, locations] of Object.entries(cache.value)) {
      if (ids.has(parentLocationId)) {
        delete cache.value[parentLocationId];
        void deletePersistentCache(persistentCacheKey(`location-children:${parentLocationId}`));
        continue;
      }

      const filtered = locations.filter(location => !ids.has(location.id));
      if (filtered.length !== locations.length) {
        cache.value[parentLocationId] = filtered;
        void writePersistentCache(persistentCacheKey(`location-children:${parentLocationId}`), filtered);
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
    removeLocations,
    invalidate,
  };
}
