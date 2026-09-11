<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiMapMarkerOutline from "~icons/mdi/map-marker-outline";
  import type { TreeItem } from "~/lib/api/types/data-contracts";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import LocationCompactTree from "~/components/Location/CompactTree.vue";
  import { Card } from "~/components/ui/card";

  definePageMeta({ middleware: ["auth"] });
  const { t } = useI18n();
  useHead({ title: computed(() => `HomeBox | ${t("menu.locations")}`) });

  const api = useUserApi();
  const { data: tree } = useAsyncData("location-grid", async () => {
    const { data, error } = await api.items.getTree({ withItems: false });
    return error ? [] : data;
  });

  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const rootLocations = computed<TreeItem[]>(() =>
    [...(tree.value ?? [])].filter(item => item.type === "location").sort((a, b) => collator.compare(a.name, b.name))
  );
</script>

<template>
  <BaseContainer>
    <BaseSectionHeader class="mb-4">{{ $t("menu.locations") }}</BaseSectionHeader>

    <div v-if="rootLocations.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card v-for="location in rootLocations" :key="location.id" class="overflow-hidden">
        <NuxtLink
          :to="`/location/${location.id}`"
          class="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 font-medium transition-colors hover:bg-accent"
        >
          <MdiMapMarkerOutline class="size-5 shrink-0" />
          <span class="truncate">{{ location.name }}</span>
        </NuxtLink>
        <LocationCompactTree :locations="location.children" />
      </Card>
    </div>

    <p v-else class="py-12 text-center text-muted-foreground">
      {{ $t("locations.no_results") }}
    </p>
  </BaseContainer>
</template>
