<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "~/components/ui/sonner";
  import { useEntityTypeStore } from "~/stores/entityTypes";
  import { createLocationCsv, parseLocationCsv } from "~/lib/locations/import-export";
  import MdiMapMarkerOutline from "~icons/mdi/map-marker-outline";
  import MdiStairs from "~icons/mdi/stairs";
  import type { TreeItem } from "~/lib/api/types/data-contracts";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import LocationCompactTree from "~/components/Location/CompactTree.vue";
  import { Card } from "~/components/ui/card";
  import { Button } from "~/components/ui/button";

  definePageMeta({ middleware: ["auth"] });
  const { t } = useI18n();
  useHead({ title: computed(() => `HomeBox | ${t("menu.locations")}`) });

  const api = useUserApi();
  const { data: tree, refresh: refreshTree } = useAsyncData("location-grid", async () => {
    const { data, error } = await api.items.getTree({ withItems: false });
    return error ? [] : data;
  });

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

  const importing = ref(false);
  const csvInput = ref<HTMLInputElement>();
  const confirm = useConfirm();

  async function importLocations(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || importing.value) return;
    importing.value = true;
    let created = 0;
    try {
      const paths = parseLocationCsv(await file.text());
      if (!paths.length) throw new Error("Le fichier ne contient aucun emplacement.");
      const { isCanceled } = await confirm.open(`Importer ${paths.length} chemins d’emplacements ? Les données existantes seront conservées.`);
      if (isCanceled) return;
      const types = useEntityTypeStore();
      await types.refresh();
      const locationType = types.locationTypes[0];
      if (!locationType) throw new Error("Type Emplacement introuvable.");
      const result = await api.items.getTree({ withItems: false });
      if (result.error) throw result.error;
      const ids = new Map<string, string>();
      const remember = (nodes: TreeItem[], ancestors: string[]) => {
        for (const node of nodes) {
          if (node.type !== "location") continue;
          const path = [...ancestors, node.name.trim()];
          const key = JSON.stringify(path);
          if (ids.has(key)) throw new Error("Plusieurs emplacements ont le même chemin : " + path.join(" → "));
          ids.set(key, node.id);
          remember(node.children ?? [], path);
        }
      };
      remember(result.data ?? [], []);
      for (const path of paths) {
        let parentId: string | null = null;
        for (let level = 0; level < path.length; level++) {
          const key = JSON.stringify(path.slice(0, level + 1));
          let id = ids.get(key);
          if (!id) {
            const response = await api.items.createLocation({
              name: path[level]!, description: "", parentId,
              entityTypeId: locationType.id, quantity: 1, tagIds: [],
            });
            if (response.error) throw response.error;
            id = response.data.id;
            ids.set(key, id);
            created++;
          }
          parentId = id;
        }
      }
      toast.success(`Import terminé : ${created} emplacement(s) créé(s), chemins existants ou dupliqués ignorés.`);
    } catch (error) {
      toast.error(`Import interrompu après ${created} création(s). ${error instanceof Error ? error.message : "Erreur serveur."}`);
    } finally {
      try {
        await refreshTree();
      } finally {
        importing.value = false;
      }
    }
  }

  async function exportLocations() {
    try {
      const { data, error } = await api.items.getTree({ withItems: false });
      if (error) throw error;
      const blob = new Blob([createLocationCsv(data ?? [])], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "homebox-emplacements.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Impossible d’exporter les emplacements.");
    }
  }
</script>

<template>
  <BaseContainer>
    <BaseSectionHeader class="mb-4">{{ $t("menu.locations") }}</BaseSectionHeader>
    <div class="mb-4 flex flex-wrap justify-end gap-2">
      <input ref="csvInput" type="file" accept=".csv" class="hidden" @change="importLocations" />
      <Button type="button" :disabled="importing" @click="csvInput?.click()">
        {{ importing ? "Import en cours…" : "Importer CSV" }}
      </Button>
      <Button type="button" variant="outline" :disabled="importing" @click="exportLocations">Exporter CSV</Button>
    </div>

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

    <p v-else class="py-12 text-center text-muted-foreground">
      {{ $t("locations.no_results") }}
    </p>
  </BaseContainer>
</template>
