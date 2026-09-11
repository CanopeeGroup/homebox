<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import MdiPlus from "~icons/mdi/plus";
  import MdiDownload from "~icons/mdi/download";
  import MdiUpload from "~icons/mdi/upload";
  import MdiViewGrid from "~icons/mdi/view-grid";
  import MdiViewList from "~icons/mdi/view-list";
  import { useLocalStorage } from "@vueuse/core";
  import { Button } from "@/components/ui/button";
  import { useDialog } from "@/components/ui/dialog-provider";
  import { DialogID } from "~/components/ui/dialog-provider/utils";
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

  const { data: templates, refresh } = useAsyncData("templates", async () => {
    const { data, error } = await api.templates.getAll();
    if (error) {
      toast.error(t("components.template.toast.load_failed"));
      return [];
    }
    return data;
  });

  // Wrapper functions to match event signatures
  const handleRefresh = () => refresh();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDuplicated = (_id: string) => refresh();

  const jsonImportInput = ref<HTMLInputElement>();
  const csvImportInput = ref<HTMLInputElement>();
  const importing = ref(false);
  const exporting = ref(false);
  const viewMode = useLocalStorage<"grid" | "compact">("homebox:template-view", "grid");

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
        <Button
          size="icon"
          :variant="viewMode === 'grid' ? 'default' : 'outline'"
          :title="$t('components.template.view_grid')"
          :aria-pressed="viewMode === 'grid'"
          @click="viewMode = 'grid'"
        >
          <MdiViewGrid />
        </Button>
        <Button
          size="icon"
          :variant="viewMode === 'compact' ? 'default' : 'outline'"
          :title="$t('components.template.view_compact')"
          :aria-pressed="viewMode === 'compact'"
          @click="viewMode = 'compact'"
        >
          <MdiViewList />
        </Button>
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

    <div
      v-if="templates && templates.length > 0"
      :class="viewMode === 'compact' ? 'flex flex-col gap-1' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'"
    >
      <TemplateCard
        v-for="tpl in templates"
        :key="tpl.id"
        :template="tpl"
        :compact="viewMode === 'compact'"
        @deleted="handleRefresh"
        @duplicated="handleDuplicated"
      />
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
