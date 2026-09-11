<script setup lang="ts">
  /* eslint-disable vue/no-undef-components -- recursive component resolved from its SFC filename */
  import MdiChevronRight from "~icons/mdi/chevron-right";
  import MdiMapMarker from "~icons/mdi/map-marker";
  import type { TreeItem } from "~/lib/api/types/data-contracts";

  defineOptions({ name: "LocationCompactTree" });

  const props = defineProps<{ locations: TreeItem[] }>();
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const sortedLocations = computed(() =>
    props.locations.filter(item => item.type === "location").sort((a, b) => collator.compare(a.name, b.name))
  );
</script>

<template>
  <ul v-if="sortedLocations.length" class="divide-y px-2 py-1">
    <li v-for="location in sortedLocations" :key="location.id">
      <NuxtLink
        :to="`/location/${location.id}`"
        class="flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <MdiMapMarker class="size-4 shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1 truncate">{{ location.name }}</span>
        <MdiChevronRight class="size-4 shrink-0 text-muted-foreground" />
      </NuxtLink>
      <LocationCompactTree v-if="location.children?.length" :locations="location.children" class="ml-4" />
    </li>
  </ul>
  <p v-else class="px-3 py-2 text-xs text-muted-foreground">{{ $t("locations.no_sub_locations") }}</p>
</template>
