<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import MdiPlus from "~icons/mdi/plus";
  import MdiDownload from "~icons/mdi/download";
  import MdiUpload from "~icons/mdi/upload";
  import MdiDelete from "~icons/mdi/delete";
  import MdiChevronLeft from "~icons/mdi/chevron-left";
  import MdiChevronRight from "~icons/mdi/chevron-right";
  import { Button } from "@/components/ui/button";
  import { Checkbox } from "@/components/ui/checkbox";
  import { useDialog } from "@/components/ui/dialog-provider";
  import { DialogID } from "~/components/ui/dialog-provider/utils";
  import type { EntityTemplateSummary } from "~~/lib/api/types/data-contracts";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import TemplateCard from "~/components/Template/Card.vue";
  import TemplateCreateModal from "~/components/Template/CreateModal.vue";
  import {
    createTemplateCsv,
    createTemplateExport,
    parseTemplateCsv,
    parseTemplateExport,
    toTemplateCreate,
    type PortableTemplate,
  } from "~/lib/templates/import-export";

  definePageMeta({
    middleware: ["auth"],
  });

  const { t } = useI18n();

  useHead({
    title: computed(() => `HomeBox | ${t("pages.templates.title")}`),
  });

  const api = useUserApi();
  const { openDialog } = useDialog();
  const confirm = useConfirm();

  const templates = ref<EntityTemplateSummary[]>([]);
  const templatesLoading = ref(false);

  const refresh = async () => {
    if (templatesLoading.value) return;
    templatesLoading.value = true;
    try {
      const { data, error } = await api.templates.getAll();
      if (error) {
        if (!templates.value.length) toast.error(t("components.template.toast.load_failed"));
        return;
      }
      templates.value = data;
      void writePersistentCache(persistentCacheKey("templates"), data);
    } finally {
      templatesLoading.value = false;
    }
  };

  onMounted(async () => {
    const cached = await readPersistentCache<EntityTemplateSummary[]>(
      persistentCacheKey("templates"),
      24 * 60 * 60 * 1000
    );
    if (cached) templates.value = cached;
    await refresh();
  });

  // Wrapper functions to match event signatures
  const handleRefresh = () => refresh();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDuplicated = (_id: string) => refresh();

  const jsonImportInput = ref<HTMLInputElement>();
  const csvImportInput = ref<HTMLInputElement>();
  const importing = ref(false);
  const exporting = ref(false);
  const selectedTemplateIds = ref<string[]>([]);
  const pageSize = 100;
  const currentPage = ref(1);
  const totalPages = computed(() => Math.max(1, Math.ceil((templates.value?.length ?? 0) / pageSize)));
  const paginatedTemplates = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return (templates.value ?? []).slice(start, start + pageSize);
  });

  watch(totalPages, pageCount => {
    if (currentPage.value > pageCount) currentPage.value = pageCount;
  });
  const selectedTemplateIdSet = computed(() => new Set(selectedTemplateIds.value));
  const allTemplatesSelected = computed(
    () => !!templates.value?.length && templates.value.every(template => selectedTemplateIdSet.value.has(template.id))
  );

  const setTemplateSelected = (id: string, selected: boolean) => {
    selectedTemplateIds.value = selected
      ? [...new Set([...selectedTemplateIds.value, id])]
      : selectedTemplateIds.value.filter(selectedId => selectedId !== id);
  };

  const toggleAllTemplates = () => {
    selectedTemplateIds.value = allTemplatesSelected.value ? [] : (templates.value ?? []).map(template => template.id);
  };

  const deleteSelectedTemplates = async () => {
    if (!selectedTemplateIds.value.length) return;
    const { isCanceled } = await confirm.open(
      t("components.template.confirm_delete_selected", { count: selectedTemplateIds.value.length })
    );
    if (isCanceled) return;

    let deleted = 0;
    let failed = 0;
    for (const id of selectedTemplateIds.value) {
      const { error } = await api.templates.delete(id);
      if (error) failed++;
      else deleted++;
    }
    selectedTemplateIds.value = [];
    await refresh();
    if (failed) toast.error(t("components.template.toast.delete_selected_failed", { deleted, failed }));
    else toast.success(t("components.template.toast.deleted_selected", { count: deleted }));
  };

  const getFullTemplates = async () => {
    if (!templates.value?.length) {
      toast.error(t("components.template.toast.export_empty"));
      return null;
    }

    const results = await Promise.all(templates.value.map(template => api.templates.get(template.id)));
    if (results.some(result => result.error)) throw new Error("Could not load templates for export");
    return results.map(result => result.data);
  };

  const download = (content: string, type: string, extension: "json" | "csv") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `homebox-templates-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplates = async (format: "json" | "csv") => {
    exporting.value = true;
    try {
      const fullTemplates = await getFullTemplates();
      if (!fullTemplates) return;
      if (format === "json") {
        download(JSON.stringify(createTemplateExport(fullTemplates), null, 2), "application/json", "json");
      } else {
        download(createTemplateCsv(fullTemplates), "text/csv;charset=utf-8", "csv");
      }
      toast.success(
        t("components.template.toast.exported", {
          count: fullTemplates.length,
        })
      );
    } catch {
      toast.error(t("components.template.toast.export_failed"));
    } finally {
      exporting.value = false;
    }
  };

  const createImportedTemplates = async (portableTemplates: PortableTemplate[]) => {
    const [locationsResult, tagsResult] = await Promise.all([api.items.getLocations(), api.tags.getAll()]);
    if (locationsResult.error || tagsResult.error) throw new Error("Could not load collection references");

    const existingNames = new Set((templates.value ?? []).map(template => template.name.trim().toLocaleLowerCase()));
    let imported = 0;
    let skipped = 0;
    for (const template of portableTemplates) {
      if (existingNames.has(template.name.trim().toLocaleLowerCase())) {
        skipped++;
        continue;
      }
      const result = await api.templates.create(toTemplateCreate(template, locationsResult.data, tagsResult.data));
      if (result.error) throw new Error(`Could not import template ${template.name}`);
      existingNames.add(template.name.trim().toLocaleLowerCase());
      imported++;
    }
    await refresh();
    toast.success(t("components.template.toast.imported", { imported, skipped }));
  };

  const importTemplates = async (event: Event, format: "json" | "csv") => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    importing.value = true;
    try {
      const contents = await file.text();
      const portableTemplates =
        format === "json" ? parseTemplateExport(JSON.parse(contents)).templates : parseTemplateCsv(contents);
      await createImportedTemplates(portableTemplates);
    } catch {
      toast.error(t("components.template.toast.import_failed"));
    } finally {
      importing.value = false;
    }
  };
</script>
<template>
  <BaseContainer>
    <div class="mb-4 flex flex-wrap justify-between gap-2">
      <BaseSectionHeader>{{ $t("pages.templates.title") }}</BaseSectionHeader>
      <div class="flex flex-wrap justify-end gap-2">
        <input
          ref="jsonImportInput"
          class="hidden"
          type="file"
          accept="application/json,.json"
          @change="importTemplates($event, 'json')"
        />
        <input
          ref="csvImportInput"
          class="hidden"
          type="file"
          accept="text/csv,.csv"
          @change="importTemplates($event, 'csv')"
        />
        <Button variant="outline" :disabled="importing" @click="jsonImportInput?.click()">
          <MdiUpload class="mr-2" />
          {{ $t("components.template.import_json") }}
        </Button>
        <Button variant="outline" :disabled="exporting || !templates?.length" @click="downloadTemplates('json')">
          <MdiDownload class="mr-2" />
          {{ $t("components.template.export_json") }}
        </Button>
        <Button variant="outline" :disabled="importing" @click="csvImportInput?.click()">
          <MdiUpload class="mr-2" />
          {{ $t("components.template.import_csv") }}
        </Button>
        <Button variant="outline" :disabled="exporting || !templates?.length" @click="downloadTemplates('csv')">
          <MdiDownload class="mr-2" />
          {{ $t("components.template.export_csv") }}
        </Button>
        <Button @click="openDialog(DialogID.CreateTemplate)">
          <MdiPlus class="mr-2" />
          {{ $t("global.create") }}
        </Button>
      </div>
    </div>

    <TemplateCreateModal @created="handleRefresh" />

    <div v-if="templates?.length" class="mb-3 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
      <Checkbox
        :model-value="allTemplatesSelected ? true : selectedTemplateIds.length ? 'indeterminate' : false"
        :aria-label="$t('components.template.select_all')"
        @update:model-value="toggleAllTemplates"
      />
      <Button size="sm" variant="ghost" @click="toggleAllTemplates">
        {{ allTemplatesSelected ? $t("components.template.deselect_all") : $t("components.template.select_all") }}
      </Button>
      <span class="text-sm text-muted-foreground">
        {{ $t("components.template.selected_count", { count: selectedTemplateIds.length }) }}
      </span>
      <div class="grow" />
      <Button size="sm" variant="destructive" :disabled="!selectedTemplateIds.length" @click="deleteSelectedTemplates">
        <MdiDelete class="mr-2" />
        {{ $t("components.template.delete_selected") }}
      </Button>
    </div>

    <div v-if="templates && templates.length > 0" class="flex flex-col gap-1">
      <TemplateCard
        v-for="tpl in paginatedTemplates"
        class="template-row"
        :key="tpl.id"
        :template="tpl"
        compact
        selectable
        :selected="selectedTemplateIdSet.has(tpl.id)"
        @update:selected="setTemplateSelected(tpl.id, $event)"
        @deleted="handleRefresh"
        @duplicated="handleDuplicated"
      />
    </div>

    <div v-if="templates && templates.length > 0" class="mt-4 flex items-center justify-center gap-3">
      <Button
        size="icon"
        variant="outline"
        :disabled="currentPage === 1"
        aria-label="Page précédente"
        @click="currentPage--"
      >
        <MdiChevronLeft />
      </Button>
      <span class="min-w-24 text-center text-sm text-muted-foreground">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <Button
        size="icon"
        variant="outline"
        :disabled="currentPage === totalPages"
        aria-label="Page suivante"
        @click="currentPage++"
      >
        <MdiChevronRight />
      </Button>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-12 text-center">
      <p class="mb-4 text-muted-foreground">
        {{ $t("pages.templates.no_templates") }}
      </p>
      <Button @click="openDialog(DialogID.CreateTemplate)">
        <MdiPlus class="mr-2" />
        {{ $t("components.template.create_modal.title") }}
      </Button>
    </div>
  </BaseContainer>
</template>

<style scoped>
  .template-row {
    content-visibility: auto;
    contain-intrinsic-size: 64px;
  }
</style>
