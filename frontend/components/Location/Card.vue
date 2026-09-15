<template>
  <Card>
    <NuxtLink :to="`/location/${location.id}`" class="group/location-card transition duration-300">
      <div
        :class="{
          'p-4': !dense,
          'px-3 py-2': dense,
        }"
      >
        <h2 class="flex items-center justify-between gap-2">
          <div class="relative size-6">
            <div
              class="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover/location-card:-rotate-90"
            >
              <MdiMapMarkerOutline class="size-6 group-hover/location-card:hidden" />
              <MdiArrowUp class="hidden size-6 group-hover/location-card:block" />
            </div>
          </div>
          <span class="mx-auto">
            {{ location.name }}
          </span>
          <span
            v-if="hasCount"
            class="flex shrink-0 items-center gap-1 text-primary"
            :title="`${count} article(s) présent(s)`"
            :aria-label="`${count} article(s) présent(s)`"
          >
            <MdiTag class="size-5" />
            <Badge>{{ count }}</Badge>
          </span>
          <span v-else class="size-6" aria-hidden="true" />
        </h2>
      </div>
    </NuxtLink>
  </Card>
</template>

<script lang="ts" setup>
  import type { EntityOut, EntitySummary } from "~~/lib/api/types/data-contracts";
  import MdiArrowUp from "~icons/mdi/arrow-down";
  import MdiMapMarkerOutline from "~icons/mdi/map-marker-outline";
  import MdiTag from "~icons/mdi/tag";
  import { Card } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";

  const props = defineProps({
    location: {
      type: Object as () => EntitySummary | EntityOut,
      required: true,
    },
    dense: {
      type: Boolean,
      default: false,
    },
  });

  const hasCount = computed(() => {
    return (props.location as EntitySummary).itemCount > 0;
  });

  const count = computed(() => {
    return hasCount.value ? (props.location as EntitySummary).itemCount : undefined;
  });
</script>
