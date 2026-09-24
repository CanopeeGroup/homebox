import type { EntitySummary } from "~~/lib/api/types/data-contracts";

export function useLocationItemCache() {
  const cache = useState<Record<string, EntitySummary[]>>("location-item-cache", () => ({}));

  function updateQuantity(itemId: string, quantity: number) {
    for (const items of Object.values(cache.value)) {
      const cachedItem = items.find(item => item.id === itemId);
      if (cachedItem) cachedItem.quantity = quantity;
    }
  }

  function invalidate() {
    cache.value = {};
  }

  return {
    cache,
    updateQuantity,
    invalidate,
  };
}
