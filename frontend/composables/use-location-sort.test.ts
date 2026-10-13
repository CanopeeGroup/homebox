import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { sortLocations, useLocationSort } from "./use-location-sort";

afterEach(() => vi.unstubAllGlobals());

describe("independent location sorting", () => {
  it("retains each parent's sort across branch navigation and collection changes", () => {
    const storage = ref({});
    const preferences = ref({ collectionId: "collection-a" });
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("useLocalStorage", () => storage);
    vi.stubGlobal("useViewPreferences", () => preferences);
    const parentId = ref("parent-a");
    const branch = useLocationSort(parentId);
    const root = useLocationSort("root");
    branch.mode.value = "items-desc";
    parentId.value = "parent-b";
    expect(branch.mode.value).toBe("name-asc");
    branch.mode.value = "name-desc";
    expect(root.mode.value).toBe("name-asc");
    parentId.value = "parent-a";
    expect(branch.mode.value).toBe("items-desc");
    preferences.value.collectionId = "collection-b";
    expect(branch.mode.value).toBe("name-asc");
    preferences.value.collectionId = "collection-a";
    expect(branch.mode.value).toBe("items-desc");
    expect(useLocationSort(() => parentId.value).mode.value).toBe("items-desc");
  });

  it("groups all G codes before D codes, then sorts each group numerically", () => {
    const names = ["05D", "02G", "01D", "04G", "03D", "05G", "01G", "04D", "03G", "02D"];
    const locations = names.map(name => ({ name }));
    const expected = ["01G", "02G", "03G", "04G", "05G", "01D", "02D", "03D", "04D", "05D"];
    expect(sortLocations(locations, "name-asc").map(l => l.name)).toEqual(expected);
    expect(sortLocations(locations, "name-desc").map(l => l.name)).toEqual([...expected].reverse());
    expect(locations.map(l => l.name)).toEqual(names);
  });

  it("handles unpadded numbers, lowercase sides and ordinary names consistently", () => {
    const locations = ["Étage 10", "10d", "2G", "Étage 2", "1D", "10G", "2d", "1g"].map(name => ({ name }));
    const expected = ["1g", "2G", "10G", "1D", "2d", "10d", "Étage 2", "Étage 10"];
    expect(sortLocations(locations, "name-asc").map(l => l.name)).toEqual(expected);
    expect(sortLocations([...locations].reverse(), "name-asc").map(l => l.name)).toEqual(expected);
  });

  it("sorts naturally without changing the shared tree", () => {
    const locations = [
      { name: "Étage 10", itemCount: 3 },
      { name: "Étage 2", itemCount: 5 },
    ];
    expect(sortLocations(locations, "name-asc").map(l => l.name)).toEqual(["Étage 2", "Étage 10"]);
    expect(sortLocations(locations, "items-asc").map(l => l.itemCount)).toEqual([3, 5]);
    expect(locations[0].name).toBe("Étage 10");
  });
});
