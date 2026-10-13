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

export function sortLocations<T extends SortableLocation>(locations: T[], mode: LocationSortMode): T[] {
  return [...locations].sort((a, b) => {
    switch (mode) {
      case "name-desc":
        return collator.compare(b.name, a.name);
      case "items-desc":
        return (b.itemCount ?? 0) - (a.itemCount ?? 0) || collator.compare(a.name, b.name);
      case "items-asc":
        return (a.itemCount ?? 0) - (b.itemCount ?? 0) || collator.compare(a.name, b.name);
      case "name-asc":
      default:
        return collator.compare(a.name, b.name);
    }
  });
}

export function useLocationSort(scope: MaybeRefOrGetter<string>) {
  // Sorting is intentionally scoped per parent location. Changing the order of
  // A > B therefore does not alter A > C, another root, or the root list.
  const modes = useState<Record<string, LocationSortMode>>("location-sort-modes", () => ({}));
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
