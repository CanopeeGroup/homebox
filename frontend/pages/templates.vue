<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import MdiPlus from "~icons/mdi/plus";
  import MdiDownload from "~icons/mdi/download";
  import MdiUpload from "~icons/mdi/upload";
  import { Button } from "@/components/ui/button";
  import { useDialog } from "@/components/ui/dialog-provider";
  import { DialogID } from "~/components/ui/dialog-provider/utils";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import TemplateCard from "~/components/Template/Card.vue";
  import TemplateCreateModal from "~/components/Template/CreateModal.vue";
  import { createTemplateExport, parseTemplateExport, toTemplateCreate } from "~/lib/templates/import-export";

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

  const importInput = ref<HTMLInputElement>();
  const importing = ref(false);
  const exporting = ref(false);

  const downloadTemplates = async () => {
    if (!templates.value?.length) {
      toast.error(t("components.template.toast.export_empty"));
      return;
    }

    exporting.value = true;
    try {
      const results = await Promise.all(templates.value.map(template => api.templates.get(template.id)));
      if (results.some(result => result.error)) {
        toast.error(t("components.template.toast.export_failed"));
        return;
      }

      const document = createTemplateExport(results.map(result => result.data));
      const blob = new Blob([JSON.stringify(document, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `homebox-templates-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(
        t("components.template.toast.exported", {
          count: document.templates.length,
        })
      );
    } finally {
      exporting.value = false;
    }
  };

  const importTemplates = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    importing.value = true;
    try {
      const document = parseTemplateExport(JSON.parse(await file.text()));
      const [locationsResult, tagsResult] = await Promise.all([api.items.getLocations(), api.tags.getAll()]);
      if (locationsResult.error || tagsResult.error) throw new Error("Could not load collection references");

      const existingNames = new Set((templates.value ?? []).map(template => template.name.trim().toLocaleLowerCase()));
      let imported = 0;
      let skipped = 0;

      for (const template of document.templates) {
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
    } catch {
      toast.error(t("components.template.toast.import_failed"));
    } finally {
      importing.value = false;
    }
  };
</script>
<template>
  <BaseContainer>
    <div class="mb-4 flex justify-between">
      <BaseSectionHeader>{{ $t("pages.templates.title") }}</BaseSectionHeader>
      <div class="flex flex-wrap justify-end gap-2">
        <input ref="importInput" class="hidden" type="file" accept="application/json,.json" @change="importTemplates" />
        <Button variant="outline" :disabled="importing" @click="importInput?.click()">
          <MdiUpload class="mr-2" />
          {{ $t("components.template.import") }}
        </Button>
        <Button variant="outline" :disabled="exporting || !templates?.length" @click="downloadTemplates">
          <MdiDownload class="mr-2" />
          {{ $t("components.template.export") }}
        </Button>
        <Button @click="openDialog(DialogID.CreateTemplate)">
          <MdiPlus class="mr-2" />
          {{ $t("global.create") }}
        </Button>
      </div>
    </div>

    <TemplateCreateModal @created="handleRefresh" />

    <div v-if="templates && templates.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <TemplateCard
        v-for="tpl in templates"
        :key="tpl.id"
        :template="tpl"
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
