<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiHistory from "~icons/mdi/history";
  import MdiRefresh from "~icons/mdi/refresh";
  import MdiDownload from "~icons/mdi/download";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import DateTime from "~/components/global/DateTime.vue";
  import { Button } from "~/components/ui/button";
  import { Badge } from "~/components/ui/badge";
  import { toast } from "~/components/ui/sonner";

  definePageMeta({ middleware: ["auth"] });
  const { t } = useI18n();
  useHead({ title: computed(() => `HomeBox | ${t("menu.journal")}`) });

  const api = useUserApi();
  const {
    data: entries,
    refresh,
    pending,
  } = useAsyncData("audit-logs", async () => {
    const { data, error } = await api.auditLogs.getAll();
    if (error) {
      toast.error(t("journal.load_failed"));
      return [];
    }
    return data;
  });

  const actionVariant = (action: string): "default" | "destructive" | "secondary" => {
    if (action === "delete") return "destructive";
    if (action === "create") return "default";
    return "secondary";
  };

  const operationLabel = (entry: NonNullable<typeof entries.value>[number]) => {
    const action = t(`journal.${entry.action}`);
    const resource = t(`journal.resources.${entry.resource}`, entry.resource);
    // Older journal rows contain the raw API path. Keep them readable without
    // pretending that the UUID is an object name.
    const name = entry.path && !entry.path.startsWith("/") ? ` ${entry.path}` : "";
    return `${action} ${resource}${name}`;
  };

  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const exportCsv = () => {
    if (!entries.value?.length) return;
    const rows = entries.value.map(entry => [
      new Date(entry.createdAt).toISOString(),
      entry.userName,
      t(`journal.${entry.action}`),
      t(`journal.resources.${entry.resource}`, entry.resource),
      entry.count || 1,
      operationLabel(entry),
    ]);
    const headers = [
      t("journal.date"),
      t("journal.user"),
      t("journal.action"),
      t("journal.resource"),
      t("journal.count"),
      t("journal.path"),
    ];
    const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `homebox-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
</script>

<template>
  <BaseContainer>
    <div class="mb-4 flex items-center justify-between gap-2">
      <BaseSectionHeader>
        <span class="flex items-center gap-2"><MdiHistory /> {{ $t("menu.journal") }}</span>
      </BaseSectionHeader>
      <div class="flex gap-2">
        <Button size="sm" variant="outline" :disabled="!entries?.length" @click="exportCsv">
          <MdiDownload class="mr-2" /> {{ $t("journal.export_csv") }}
        </Button>
        <Button size="sm" variant="outline" :disabled="pending" @click="refresh()">
          <MdiRefresh class="mr-2" :class="pending && 'animate-spin'" />
          {{ $t("journal.refresh") }}
        </Button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border bg-card">
      <div
        class="grid min-w-[920px] grid-cols-[minmax(150px,0.8fr)_minmax(140px,0.8fr)_110px_minmax(120px,0.7fr)_70px_minmax(220px,1.5fr)] gap-3 border-b bg-muted/50 px-4 py-2 text-sm font-medium"
      >
        <span>{{ $t("journal.date") }}</span>
        <span>{{ $t("journal.user") }}</span>
        <span>{{ $t("journal.action") }}</span>
        <span>{{ $t("journal.resource") }}</span>
        <span>{{ $t("journal.count") }}</span>
        <span>{{ $t("journal.path") }}</span>
      </div>
      <div v-if="entries?.length" class="divide-y">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="grid min-w-[920px] grid-cols-[minmax(150px,0.8fr)_minmax(140px,0.8fr)_110px_minmax(120px,0.7fr)_70px_minmax(220px,1.5fr)] items-center gap-3 px-4 py-2 text-sm"
        >
          <DateTime :date="entry.createdAt" datetime-type="time" />
          <span class="truncate" :title="entry.userName">{{ entry.userName }}</span>
          <Badge class="w-fit" :variant="actionVariant(entry.action)">{{ $t(`journal.${entry.action}`) }}</Badge>
          <span>{{ $t(`journal.resources.${entry.resource}`, entry.resource) }}</span>
          <span>{{ entry.count || 1 }}</span>
          <span class="truncate" :title="operationLabel(entry)">{{ operationLabel(entry) }}</span>
        </div>
      </div>
      <p v-else class="p-8 text-center text-muted-foreground">{{ $t("journal.empty") }}</p>
    </div>
  </BaseContainer>
</template>
