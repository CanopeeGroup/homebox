import { defineStore } from "pinia";
import type { ItemsApi } from "~~/lib/api/classes/items";
import type { EntitySummary, TreeItem } from "~~/lib/api/types/data-contracts";
import { persistentCacheKey, readPersistentCache, writePersistentCache } from "~~/composables/use-persistent-cache";

const LOCATION_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const useLocationStore = defineStore("locations", {
  state: () => ({
    parents: null as EntitySummary[] | null,
    Locations: null as EntitySummary[] | null,
    tree: null as TreeItem[] | null,
    treeRevision: 0,
    dataRevision: 0,
    refreshLocationsPromise: null as Promise<void> | null,
    refreshParentsPromise: null as Promise<ReturnType<ItemsApi["getLocations"]> extends Promise<infer R> ? R : never> | null,
    refreshChildrenPromise: null as Promise<ReturnType<ItemsApi["getLocations"]> extends Promise<infer R> ? R : never> | null,
    refreshTreePromise: null as Promise<ReturnType<ItemsApi["getTree"]> extends Promise<infer R> ? R : never> | null,
  }),
  getters: {
    /**
     * locations represents the locations that are currently in the store. The store is
     * synched with the server by intercepting the API calls and updating on the
     * response
     */
    parentLocations(state): EntitySummary[] {
      if (state.parents === null) {
        const revision = state.dataRevision;
        useUserApi()
          .items.getLocations({ filterChildren: true })
          .then(result => {
            if (result.error) {
              console.error(result.error);
              return;
            }

            // Do not let a request started before an import/restore repopulate
            // the store with stale parent locations.
            if (revision === this.dataRevision) this.parents = result.data;
          });
      }
      return state.parents ?? [];
    },
    allLocations(state): EntitySummary[] {
      return state.Locations ?? [];
    },
  },
  actions: {
    async ensureLocationsFetched() {
      if (this.Locations !== null) return;

      if (this.refreshLocationsPromise === null) {
        this.refreshLocationsPromise = (async () => {
          const revision = this.dataRevision;
          const cached = await readPersistentCache<EntitySummary[]>(
            persistentCacheKey("locations"),
            LOCATION_CACHE_MAX_AGE_MS
          );
          if (cached && this.Locations === null && revision === this.dataRevision) {
            this.Locations = cached;
          }

          // Stale-while-revalidate: cached data can render immediately while
          // the authoritative server copy refreshes in the background. If an
          // import changed the revision during IndexedDB access, force a fresh
          // request instead of trusting the cache that was just read.
          if (cached && revision === this.dataRevision) void this.refreshChildren();
          else await this.refreshChildren(true);
        })().finally(() => {
          this.refreshLocationsPromise = null;
        });
      }
      await this.refreshLocationsPromise;
    },
    async refreshParents(force = false): ReturnType<ItemsApi["getLocations"]> {
      if (this.refreshParentsPromise) {
        if (!force) return this.refreshParentsPromise;
        try {
          await this.refreshParentsPromise;
        } catch {
          // The forced request below retries against the current revision.
        }
      }

      if (this.refreshParentsPromise) return this.refreshParentsPromise;

      const revision = this.dataRevision;
      this.refreshParentsPromise = useUserApi().items.getLocations({ filterChildren: true });
      try {
        const result = await this.refreshParentsPromise;
        if (!result.error && revision === this.dataRevision) {
          this.parents = result.data;
          void writePersistentCache(persistentCacheKey("location-parents"), result.data);
        }
        return result;
      } finally {
        this.refreshParentsPromise = null;
      }
    },
    async refreshChildren(force = false): ReturnType<ItemsApi["getLocations"]> {
      if (this.refreshChildrenPromise) {
        if (!force) return this.refreshChildrenPromise;
        try {
          await this.refreshChildrenPromise;
        } catch {
          // The forced request below retries against the current revision.
        }
      }

      if (this.refreshChildrenPromise) return this.refreshChildrenPromise;

      const revision = this.dataRevision;
      this.refreshChildrenPromise = useUserApi().items.getLocations({ filterChildren: false });
      try {
        const result = await this.refreshChildrenPromise;
        if (!result.error && revision === this.dataRevision) {
          this.Locations = result.data;
          void writePersistentCache(persistentCacheKey("locations"), result.data);
        }
        return result;
      } finally {
        this.refreshChildrenPromise = null;
      }
    },
    invalidateAllRequests() {
      // Any response that started before this boundary is stale and must not
      // overwrite post-import/post-restore data when it arrives later.
      this.dataRevision += 1;
      this.treeRevision += 1;
    },
    adjustItemCount(locationId: string, delta: number) {
      const adjustSummary = (location: EntitySummary) => {
        if (location.id === locationId) {
          location.itemCount = Math.max(0, (location.itemCount ?? 0) + delta);
        }
      };

      this.parents?.forEach(adjustSummary);
      this.Locations?.forEach(adjustSummary);

      const visitTree = (nodes: TreeItem[] | null) => {
        for (const node of nodes ?? []) {
          if (node.id === locationId) {
            node.itemCount = Math.max(0, (node.itemCount ?? 0) + delta);
            return true;
          }
          if (visitTree(node.children)) return true;
        }
        return false;
      };
      visitTree(this.tree);

      if (this.parents) void writePersistentCache(persistentCacheKey("location-parents"), this.parents);
      if (this.Locations) void writePersistentCache(persistentCacheKey("locations"), this.Locations);
      if (this.tree) void writePersistentCache(persistentCacheKey("location-tree"), this.tree);
    },
    removeLocations(locationIds: string[]) {
      // Invalidate any tree request that started before this local mutation.
      // A late response from that request must not resurrect deleted locations.
      this.treeRevision += 1;
      this.dataRevision += 1;
      const ids = new Set(locationIds);
      if (this.parents) this.parents = this.parents.filter(location => !ids.has(location.id));
      if (this.Locations) this.Locations = this.Locations.filter(location => !ids.has(location.id));

      const pruneTree = (nodes: TreeItem[] | null): TreeItem[] | null => {
        if (!nodes) return nodes;
        return nodes
          .filter(node => !ids.has(node.id))
          .map(node => ({
            ...node,
            children: pruneTree(node.children) ?? [],
          }));
      };
      this.tree = pruneTree(this.tree);

      if (this.parents) void writePersistentCache(persistentCacheKey("location-parents"), this.parents);
      if (this.Locations) void writePersistentCache(persistentCacheKey("locations"), this.Locations);
      if (this.tree) void writePersistentCache(persistentCacheKey("location-tree"), this.tree);
    },
    async refreshTree(force = false): ReturnType<ItemsApi["getTree"]> {
      if (this.refreshTreePromise) {
        if (!force) return this.refreshTreePromise;
        try {
          await this.refreshTreePromise;
        } catch {
          // A forced refresh below will retry against the authoritative API.
        }
      }

      if (this.refreshTreePromise) return this.refreshTreePromise;

      const revision = this.treeRevision;
      const dataRevision = this.dataRevision;
      this.refreshTreePromise = useUserApi().items.getTree({ withItems: false });
      try {
        const result = await this.refreshTreePromise;
        if (!result.error && revision === this.treeRevision && dataRevision === this.dataRevision) {
          this.tree = result.data;
          void writePersistentCache(persistentCacheKey("location-tree"), result.data);
        }
        return result;
      } finally {
        this.refreshTreePromise = null;
      }
    },
  },
});
