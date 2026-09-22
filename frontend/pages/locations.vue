<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiMapMarkerOutline from "~icons/mdi/map-marker-outline";
  import MdiStairs from "~icons/mdi/stairs";
  import MdiRefresh from "~icons/mdi/refresh";
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
  const manualRefreshing = ref(false);

  async function refreshLocationPage() {
    const hadTree = locationStore.tree !== null;
    initialLoading.value = !hadTree;

    try {
      // Render the browser cache immediately when available, then refresh once
      // for this page mount (typically the post-login landing page).
      if (!hadTree) {
        const cached = await readPersistentCache<TreeItem[]>(
          persistentCacheKey("location-tree"),
          24 * 60 * 60 * 1000
        );
        if (cached) locationStore.tree = cached;
      }

      // This page only renders the tree. Fetching the two flat location lists
      // here duplicated large API responses on phones/tablets without improving
      // the initial render. Other screens load those datasets on demand.
      await locationStore.refreshTree();
    } finally {
      initialLoading.value = false;
    }
  }

  onMounted(() => void refreshLocationPage());

  async function manualRefreshLocations() {
    if (manualRefreshing.value) return;
    manualRefreshing.value = true;
    try {
      await locationStore.refreshTree();
    } finally {
      manualRefreshing.value = false;
    }
  }

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
    <div class="mb-4 flex items-center justify-between gap-2">
      <BaseSectionHeader class="mb-0">{{ $t("menu.locations") }}</BaseSectionHeader>
      <Button
        size="icon"
        variant="ghost"
        :disabled="manualRefreshing"
        title="Actualiser les emplacements"
        aria-label="Actualiser les emplacements"
        @click="manualRefreshLocations"
      >
        <MdiRefresh class="size-5" :class="manualRefreshing && 'animate-spin'" />
      </Button>
    </div>


    <div v-if="rootLocations.length" class="location-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card v-for="location in rootLocations" :key="location.id" class="self-start overflow-hidden">
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

<style scoped>
  /* Skip layout/paint work for off-screen cards on long mobile location lists.
     The intrinsic size keeps scrolling stable until the browser renders a card. */
  .location-grid > :deep(*) {
    content-visibility: auto;
    contain-intrinsic-size: auto 42px;
  }
</style>
