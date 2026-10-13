import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";

export type LocationSortMode = "name-asc" | "name-desc" | "items-desc" | "items-asc";

export type SortableLocation = {
  name: string;
  itemCount?: number;
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const locationSortOptions = [
  { value: "name-asc" as const, label: "Nom : A → Z" },
  { value: "name-desc" as const, label: "Nom : Z → A" },
  { value: "items-desc" as const, label: "Objets : plus nombreux" },
  { value: "items-asc" as const, label: "Objets : moins nombreux" },
];

// Numbered left/right locations form two contiguous groups: G, then D.
// Keep code locations together when ordinary names appear in the same list,
// so comparison stays transitive regardless of the server's original order.
function compareLocationNames(a: string, b: string): number {
  const codeA = /^(\d+)\s*([GD])$/i.exec(a.trim());
  const codeB = /^(\d+)\s*([GD])$/i.exec(b.trim());
  if (codeA && codeB) {
    const sideA = codeA[2]!.toUpperCase() === "G" ? 0 : 1;
    const sideB = codeB[2]!.toUpperCase() === "G" ? 0 : 1;
    return sideA - sideB || collator.compare(codeA[1]!, codeB[1]!) || collator.compare(a, b);
  }
  if (codeA) return -1;
  if (codeB) return 1;
  return collator.compare(a, b);
}

export function sortLocations<T extends SortableLocation>(locations: T[], mode: LocationSortMode): T[] {
  return [...locations].sort((a, b) => {
    switch (mode) {
      case "name-desc":
        return compareLocationNames(b.name, a.name);
      case "items-desc":
        return (b.itemCount ?? 0) - (a.itemCount ?? 0) || compareLocationNames(a.name, b.name);
      case "items-asc":
        return (a.itemCount ?? 0) - (b.itemCount ?? 0) || compareLocationNames(a.name, b.name);
      case "name-asc":
      default:
        return compareLocationNames(a.name, b.name);
    }
  });
}

export function useLocationSort(scope: MaybeRefOrGetter<string>) {
  // Sorting is intentionally scoped per parent location. Changing the order of
  // A > B therefore does not alter A > C, another root, or the root list.
  const modes = useLocalStorage<Record<string, LocationSortMode>>("homebox/location-sort-modes", {});
  const preferences = useViewPreferences();

  const scopeKey = computed(() => {
    const collectionId = preferences.value.collectionId || "default";
    return `${collectionId}:${toValue(scope)}`;
  });

  const mode = computed<LocationSortMode>({
    get: () => modes.value[scopeKey.value] ?? "name-asc",
    set: value => {
      modes.value = {
        ...modes.value,
        [scopeKey.value]: value,
      };
    },
  });

  return {
    mode,
    options: locationSortOptions,
  };
}
