<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiMapMarkerOutline from "~icons/mdi/map-marker-outline";
  import MdiStairs from "~icons/mdi/stairs";
  import type { TreeItem } from "~/lib/api/types/data-contracts";
  import { useLocationStore } from "~~/stores/locations";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import LocationCompactTree from "~/components/Location/CompactTree.vue";
  import { Card } from "~/components/ui/card";
  import { Button } from "~/components/ui/button";

  definePageMeta({ middleware: ["auth"] });
  const { t } = useI18n();
  useHead({ title: computed(() => `HomeBox | ${t("menu.locations")}`) });

  const locationStore = useLocationStore();
  const tree = computed(() => locationStore.tree ?? []);
  const initialLoading = ref(locationStore.tree === null);

  async function refreshLocationPage() {
    const hadTree = locationStore.tree !== null;
    initialLoading.value = !hadTree;

    try {
      // Cache is only used to make a cold start immediately useful. Every
      // visit to /locations still performs an authoritative server refresh.
      if (!hadTree) {
        const cached = await readPersistentCache<TreeItem[]>(
          persistentCacheKey("location-tree"),
          24 * 60 * 60 * 1000
        );
        if (cached) locationStore.tree = cached;
      }

      // Always refresh all location datasets on page entry. The store writes
      // every successful response back to the collection-scoped IndexedDB cache.
      await Promise.all([
        locationStore.refreshTree(),
        locationStore.refreshChildren(),
        locationStore.refreshParents(),
      ]);
    } finally {
      initialLoading.value = false;
    }
  }

  // pages are normally mounted again when navigating back to /locations.
  // This deliberately refreshes even when Pinia/IndexedDB already has data.
  onMounted(() => void refreshLocationPage());

  watch(
    () => useViewPreferences().value.collectionId,
    async (next, previous) => {
      if (next === previous) return;
      locationStore.tree = null;
      locationStore.Locations = null;
      locationStore.parents = null;
      await refreshLocationPage();
    }
  );

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const rootLocations = computed<TreeItem[]>(() =>
    [...(tree.value ?? [])].filter(item => item.type === "location").sort((a, b) => collator.compare(a.name, b.name))
  );

  const expandedLocations = ref(new Set<string>());
  const isExpanded = (id: string) => expandedLocations.value.has(id);
  const toggleLocation = (id: string) => {
    const next = new Set(expandedLocations.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedLocations.value = next;
  };

</script>

<template>
  <BaseContainer>
    <BaseSectionHeader class="mb-4">{{ $t("menu.locations") }}</BaseSectionHeader>


    <div v-if="rootLocations.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card v-for="location in rootLocations" :key="location.id" class="overflow-hidden">
        <div class="flex items-center border-b bg-muted/40">
          <NuxtLink
            :to="`/location/${location.id}`"
            class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 font-medium transition-colors hover:bg-accent"
          >
            <MdiMapMarkerOutline class="size-5 shrink-0" />
            <span class="truncate">{{ location.name }}</span>
          </NuxtLink>
          <Button
            size="icon"
            variant="ghost"
            class="mr-1 size-8 shrink-0"
            :disabled="!location.children?.some(child => child.type === 'location')"
            :aria-expanded="isExpanded(location.id)"
            :title="$t(isExpanded(location.id) ? 'locations.collapse_tree' : 'locations.expand_tree')"
            @click="toggleLocation(location.id)"
          >
            <MdiStairs class="size-5" :class="isExpanded(location.id) && 'text-primary'" />
          </Button>
        </div>
        <LocationCompactTree v-if="isExpanded(location.id)" :locations="location.children" />
      </Card>
    </div>

    <div v-else-if="initialLoading" class="py-12 text-center text-muted-foreground">
      Chargement des emplacements…
    </div>
    <p v-else class="py-12 text-center text-muted-foreground">
      {{ $t("locations.no_results") }}
    </p>
  </BaseContainer>
</template>
