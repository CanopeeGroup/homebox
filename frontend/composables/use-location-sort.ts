export type LocationSortMode = "name-asc" | "name-desc" | "items-desc" | "items-asc";

export type SortableLocation = {
  name: string;
  itemCount?: number;
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

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

export function useLocationSort() {
  const mode = useState<LocationSortMode>("location-sort-mode", () => "name-asc");

  return {
    mode,
    options: [
      { value: "name-asc" as const, label: "Nom : A → Z" },
      { value: "name-desc" as const, label: "Nom : Z → A" },
      { value: "items-desc" as const, label: "Objets : plus nombreux" },
      { value: "items-asc" as const, label: "Objets : moins nombreux" },
    ],
  };
}
