<script setup lang="ts">
  /* eslint-disable vue/no-undef-components -- recursive component resolved from its SFC filename */
  import MdiChevronRight from "~icons/mdi/chevron-right";
  import MdiMapMarker from "~icons/mdi/map-marker";
  import MdiTag from "~icons/mdi/tag";
  import MdiStairs from "~icons/mdi/stairs";
  import type { TreeItem } from "~/lib/api/types/data-contracts";

  defineOptions({ name: "LocationCompactTree" });

  const props = defineProps<{ locations: TreeItem[] }>();
  // The API tree is already ordered by name. Avoid recursively cloning and
  // sorting every branch when a large root location is expanded on mobile.
  const sortedLocations = computed(() => props.locations.filter(item => item.type === "location"));
  const expandedLocations = ref(new Set<string>());
  const hasLocationChildren = (location: TreeItem) => location.children?.some(child => child.type === "location") ?? false;
  const isExpanded = (id: string) => expandedLocations.value.has(id);
  const toggleLocation = (id: string) => {
    const next = new Set(expandedLocations.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedLocations.value = next;
  };
</script>

<template>
  <ul v-if="sortedLocations.length" class="divide-y px-2 py-1">
    <li v-for="location in sortedLocations" :key="location.id" class="location-tree-row">
      <div class="flex items-center">
        <NuxtLink
          :to="`/location/${location.id}`"
          class="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          <MdiMapMarker class="size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1 truncate">{{ location.name }}</span>
          <span
            v-if="location.itemCount > 0"
            class="flex shrink-0 items-center text-primary"
            :title="`${location.itemCount} article(s) présent(s)`"
            :aria-label="`${location.itemCount} article(s) présent(s)`"
          >
            <MdiTag class="size-4" />
          </span>
          <MdiChevronRight class="size-4 shrink-0 text-muted-foreground" />
        </NuxtLink>
        <button
          v-if="hasLocationChildren(location)"
          type="button"
          class="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-accent"
          :aria-expanded="isExpanded(location.id)"
          :title="$t(isExpanded(location.id) ? 'locations.collapse_tree' : 'locations.expand_tree')"
          @click="toggleLocation(location.id)"
        >
          <MdiStairs class="size-4" :class="isExpanded(location.id) && 'text-primary'" />
        </button>
      </div>
      <LocationCompactTree
        v-if="hasLocationChildren(location) && isExpanded(location.id)"
        :locations="location.children"
        class="ml-4"
      />
    </li>
  </ul>
  <p v-else class="px-3 py-2 text-xs text-muted-foreground">{{ $t("locations.no_sub_locations") }}</p>
</template>

<style scoped>
  .location-tree-row {
    content-visibility: auto;
    contain-intrinsic-size: auto 34px;
  }
</style>
