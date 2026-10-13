import { watchImportCompletion } from "~~/lib/watch-import-completion";
import type { TreeItem } from "~~/lib/api/types/data-contracts";

let inventoryRefreshPromise: Promise<void> | null = null;
let inventoryRefreshPending = false;
let entityRefreshPromise: Promise<void> | null = null;
const trackedImports = new Map<string, () => void>();

function treeStructureSignature(tree: TreeItem[] | null): string {
  if (!tree) return "";

  const entries: string[] = [];
  const walk = (nodes: TreeItem[], parentId = "") => {
    for (const node of nodes) {
      if (node.type !== "location") continue;
      entries.push(`${parentId}|${node.id}|${node.name}`);
      walk(node.children ?? [], node.id);
    }
  };

  walk(tree);
  entries.sort();
  return entries.join("\n");
}

export function useInventoryRefresh() {
  const locationStore = useLocationStore();
  const nuxtApp = useNuxtApp();
  const api = useUserApi();
  const preferences = useViewPreferences();
  const auth = useAuthContext();
  const { cache: locationItemCache } = useLocationItemCache();
  const { cache: childLocationCache } = useLocationChildCache();
  const locationDetailCache = useState<Record<string, unknown>>("location-detail-cache", () => ({}));

  async function clearLocationPageCaches(allCollections = false) {
    locationItemCache.value = {};
    childLocationCache.value = {};
    locationDetailCache.value = {};

    if (allCollections) {
      await clearPersistentCache();
      return;
    }

    await Promise.all([
      deletePersistentCachePrefix(persistentCacheKey("location-detail:")),
      deletePersistentCachePrefix(persistentCacheKey("location-children:")),
      deletePersistentCachePrefix(persistentCacheKey("location-items:")),
    ]);
  }

  async function clearInventoryData(allCollections = false) {
    // Move the store to a new request generation first. Any slower response
    // that started before an import/restore is then ignored on arrival.
    locationStore.invalidateAllRequests();

    await clearLocationPageCaches(allCollections);

    if (!allCollections) {
      await Promise.all([
        deletePersistentCache(persistentCacheKey("location-tree")),
        deletePersistentCache(persistentCacheKey("location-parents")),
        deletePersistentCache(persistentCacheKey("locations")),
      ]);
    }

    // Keep mounted data visible until revalidation completes. Clearing Nuxt
    // data also discards its pending request tracking; refresh cancels those
    // requests safely instead. Full restores leave no resident inventory.
    if (allCollections) {
      locationStore.tree = null;
      locationStore.parents = null;
      locationStore.Locations = null;
      await nuxtApp.runWithContext(() => clearNuxtData());
    }
  }

  async function refreshMountedData() {
    try {
      await nuxtApp.runWithContext(() => refreshNuxtData());
    } catch (error) {
      console.error("Inventory page refresh failed after cache invalidation", error);
    }
  }

  async function refreshEntityData() {
    // A full import refresh is authoritative and supersedes lightweight entity
    // revalidation. Waiting for it avoids two refresh paths racing each other.
    if (inventoryRefreshPromise) return inventoryRefreshPromise;
    if (entityRefreshPromise) return entityRefreshPromise;

    entityRefreshPromise = (async () => {
      const beforeStructure = treeStructureSignature(locationStore.tree);
      const treeResult = await locationStore.refreshTree(true);
      const afterStructure = treeStructureSignature(locationStore.tree);

      if (!treeResult.error && beforeStructure !== afterStructure) {
        locationStore.invalidateAllRequests();
        await clearLocationPageCaches();
        await Promise.allSettled([
          locationStore.refreshTree(true),
          locationStore.refreshChildren(true),
          locationStore.refreshParents(true),
        ]);
      }

      await refreshMountedData();
    })().finally(() => {
      entityRefreshPromise = null;
    });

    return entityRefreshPromise;
  }

  async function performInventoryRefresh() {
    // If a normal entity refresh started just before the import-completion
    // event, let it finish first. The generation bump below makes its result
    // irrelevant, then the authoritative import refresh runs afterwards.
    if (entityRefreshPromise) {
      try {
        await entityRefreshPromise;
      } catch {
        // The full refresh below is the recovery path.
      }
    }

    await clearInventoryData(false);

    await Promise.allSettled([
      locationStore.refreshTree(true),
      locationStore.refreshChildren(true),
      locationStore.refreshParents(true),
    ]);

    await refreshMountedData();
  }

  async function runInventoryRefreshLoop() {
    try {
      while (inventoryRefreshPending) {
        inventoryRefreshPending = false;
        await performInventoryRefresh();
      }
    } finally {
      inventoryRefreshPromise = null;

      // An import-completion event may arrive in the tiny window between the
      // last loop check and this finally block. Never drop that final refresh.
      if (inventoryRefreshPending) {
        inventoryRefreshPromise = runInventoryRefreshLoop();
      }
    }
  }

  async function refreshInventoryData() {
    // Import/restore events can arrive several times (progress + completion).
    // Queue one extra pass if an event arrives while a refresh is already
    // running; this guarantees the final database state wins every race.
    inventoryRefreshPending = true;
    if (!inventoryRefreshPromise) {
      inventoryRefreshPromise = runInventoryRefreshLoop();
    }
    return inventoryRefreshPromise;
  }

  function trackImportJob(id: string) {
    if (trackedImports.has(id)) return;
    const collectionId = preferences.value.collectionId;
    const token = auth.attachmentToken;
    const stop = watchImportCompletion({
      getJob: () => api.backups.get(id),
      isCurrent: () => preferences.value.collectionId === collectionId && auth.attachmentToken === token,
      onCompleted: refreshInventoryData,
      onStopped: () => trackedImports.delete(id),
    });
    trackedImports.set(id, stop);
  }

  return { clearInventoryData, refreshEntityData, refreshInventoryData, trackImportJob };
}
