<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiHistory from "~icons/mdi/history";
  import MdiRefresh from "~icons/mdi/refresh";
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
</script>

<template>
  <BaseContainer>
    <div class="mb-4 flex items-center justify-between gap-2">
      <BaseSectionHeader>
        <span class="flex items-center gap-2"><MdiHistory /> {{ $t("menu.journal") }}</span>
      </BaseSectionHeader>
      <Button size="sm" variant="outline" :disabled="pending" @click="refresh()">
        <MdiRefresh class="mr-2" :class="pending && 'animate-spin'" />
        {{ $t("journal.refresh") }}
      </Button>
    </div>

    <div class="overflow-x-auto rounded-md border bg-card">
      <div
        class="grid min-w-[850px] grid-cols-[minmax(150px,0.8fr)_minmax(140px,0.8fr)_110px_minmax(120px,0.7fr)_minmax(220px,1.5fr)] gap-3 border-b bg-muted/50 px-4 py-2 text-sm font-medium"
      >
        <span>{{ $t("journal.date") }}</span>
        <span>{{ $t("journal.user") }}</span>
        <span>{{ $t("journal.action") }}</span>
        <span>{{ $t("journal.resource") }}</span>
        <span>{{ $t("journal.path") }}</span>
      </div>
      <div v-if="entries?.length" class="divide-y">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="grid min-w-[850px] grid-cols-[minmax(150px,0.8fr)_minmax(140px,0.8fr)_110px_minmax(120px,0.7fr)_minmax(220px,1.5fr)] items-center gap-3 px-4 py-2 text-sm"
        >
          <DateTime :date="entry.createdAt" datetime-type="time" />
          <span class="truncate" :title="entry.userName">{{ entry.userName }}</span>
          <Badge class="w-fit" :variant="actionVariant(entry.action)">{{ $t(`journal.${entry.action}`) }}</Badge>
          <span>{{ $t(`journal.resources.${entry.resource}`, entry.resource) }}</span>
          <code class="truncate text-xs text-muted-foreground" :title="entry.path">{{ entry.path }}</code>
        </div>
      </div>
      <p v-else class="p-8 text-center text-muted-foreground">{{ $t("journal.empty") }}</p>
    </div>
  </BaseContainer>
</template>
