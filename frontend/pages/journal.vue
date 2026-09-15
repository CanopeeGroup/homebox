<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiHistory from "~icons/mdi/history";
  import MdiRefresh from "~icons/mdi/refresh";
  import MdiDownload from "~icons/mdi/download";
  import MdiChevronLeft from "~icons/mdi/chevron-left";
  import MdiChevronRight from "~icons/mdi/chevron-right";
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
  const page = ref(1);
  const pageSize = 1000;
  const exporting = ref(false);
  const {
    data: journal,
    refresh,
    pending,
  } = useAsyncData(
    "audit-logs",
    async () => {
      const { data, error } = await api.auditLogs.getPage(page.value, pageSize);
      if (error) {
        toast.error(t("journal.load_failed"));
        return { items: [], page: 1, pageSize, total: 0, totalPages: 0 };
      }
      return data;
    },
    { watch: [page] }
  );
  const entries = computed(() => journal.value?.items ?? []);

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
    const quantity = entry.quantity == null ? "" : ` — Quantité : ${entry.quantity}`;
    return `${action} ${resource}${name}${quantity}`;
  };

  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const exportCsv = async () => {
    if (!journal.value?.total || exporting.value) return;
    exporting.value = true;
    const allEntries = [] as typeof entries.value;
    try {
      const totalPages = journal.value.totalPages;
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const result = await api.auditLogs.getPage(currentPage, pageSize);
        if (result.error) {
          toast.error(t("journal.export_failed"));
          return;
        }
        allEntries.push(...result.data.items);
      }
    } finally {
      exporting.value = false;
    }
    const rows = allEntries.map(entry => [
      new Date(entry.createdAt).toISOString(),
      entry.userName,
      t(`journal.${entry.action}`),
      t(`journal.resources.${entry.resource}`, entry.resource),
      entry.count || 1,
      entry.quantity ?? "",
      operationLabel(entry),
    ]);
    const headers = [
      t("journal.date"),
      t("journal.user"),
      t("journal.action"),
      t("journal.resource"),
      t("journal.count"),
      "Quantité",
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
        <Button size="sm" variant="outline" :disabled="!journal?.total || exporting" @click="exportCsv">
          <MdiDownload class="mr-2" :class="exporting && 'animate-pulse'" /> {{ $t("journal.export_csv") }}
        </Button>
        <Button size="sm" variant="outline" :disabled="pending" @click="refresh()">
          <MdiRefresh class="mr-2" :class="pending && 'animate-spin'" />
          {{ $t("journal.refresh") }}
        </Button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border bg-card">
      <div
        class="grid min-w-[920px] grid-cols-[minmax(150px,0.8fr)_minmax(140px,0.8fr)_110px_minmax(120px,0.7fr)_70px_90px_minmax(240px,1.5fr)] gap-3 border-b bg-muted/50 px-4 py-2 text-sm font-medium"
      >
        <span>{{ $t("journal.date") }}</span>
        <span>{{ $t("journal.user") }}</span>
        <span>{{ $t("journal.action") }}</span>
        <span>{{ $t("journal.resource") }}</span>
        <span>{{ $t("journal.count") }}</span>
        <span>Quantité</span>
        <span>{{ $t("journal.path") }}</span>
      </div>
      <div v-if="entries?.length" class="divide-y">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="grid min-w-[920px] grid-cols-[minmax(150px,0.8fr)_minmax(140px,0.8fr)_110px_minmax(120px,0.7fr)_70px_90px_minmax(240px,1.5fr)] items-center gap-3 px-4 py-2 text-sm"
        >
          <DateTime :date="entry.createdAt" datetime-type="time" />
          <span class="truncate" :title="entry.userName">{{ entry.userName }}</span>
          <Badge class="w-fit" :variant="actionVariant(entry.action)">{{ $t(`journal.${entry.action}`) }}</Badge>
          <span>{{ $t(`journal.resources.${entry.resource}`, entry.resource) }}</span>
          <span>{{ entry.count || 1 }}</span>
          <span>{{ entry.quantity ?? "—" }}</span>
          <span class="truncate" :title="operationLabel(entry)">{{ operationLabel(entry) }}</span>
        </div>
      </div>
      <p v-else class="p-8 text-center text-muted-foreground">{{ $t("journal.empty") }}</p>
    </div>
    <div v-if="journal?.total" class="mt-3 flex items-center justify-between gap-3 text-sm">
      <span>{{ $t("journal.total", { total: journal.total }) }}</span>
      <div class="flex items-center gap-2">
        <Button size="icon" variant="outline" :disabled="page <= 1 || pending" @click="page--">
          <MdiChevronLeft />
        </Button>
        <span>{{ $t("journal.page", { page, total: journal.totalPages }) }}</span>
        <Button size="icon" variant="outline" :disabled="page >= journal.totalPages || pending" @click="page++">
          <MdiChevronRight />
        </Button>
      </div>
    </div>
  </BaseContainer>
</template>
