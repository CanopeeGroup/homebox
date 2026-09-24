import type { EntitySummary } from "~~/lib/api/types/data-contracts";

export function useLocationChildCache() {
  const cache = useState<Record<string, EntitySummary[]>>("location-child-cache", () => ({}));

  function adjustItemCount(locationId: string, delta: number) {
    for (const locations of Object.values(cache.value)) {
      const cachedLocation = locations.find(location => location.id === locationId);
      if (cachedLocation) {
        cachedLocation.itemCount = Math.max(0, (cachedLocation.itemCount ?? 0) + delta);
      }
    }
  }

  function invalidate(parentLocationId?: string) {
    if (parentLocationId) {
      delete cache.value[parentLocationId];
      return;
    }
    cache.value = {};
  }

  return {
    cache,
    adjustItemCount,
    invalidate,
  };
}
