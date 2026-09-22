<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import { Button } from "@/components/ui/button";
  import MdiLoading from "~icons/mdi/loading";
  import FormTextField from "~/components/Form/TextField.vue";
  import type { Group } from "~~/lib/api/types/data-contracts";

  definePageMeta({
    middleware: ["auth"],
  });

  const { t } = useI18n();

  useHead({ title: `HomeBox | ${t("collection.tabs.settings")}` });

  const api = useUserApi();
  const { selectedCollection, load: reloadCollections } = useCollections();

  const loading = ref(true);
  const saving = ref(false);
  const error = ref<string | null>(null);

  const group = ref<Group | null>(null);
  const name = ref("");

  const loadSettings = async () => {
    if (!selectedCollection.value) {
      loading.value = false;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const res = await api.group.get(selectedCollection.value.id);
      if (res.error || !res.data) {
        const msg = t("errors.api_failure") + String(res.error ?? "");
        error.value = msg;
        toast.error(msg);
        return;
      }

      group.value = res.data;
      name.value = res.data.name;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      error.value = msg;
      toast.error(msg);
    } finally {
      loading.value = false;
    }
  };

  watch(
    () => selectedCollection.value?.id,
    () => {
      void loadSettings();
    },
    { immediate: true }
  );

  const save = async () => {
    if (!selectedCollection.value) return;

    saving.value = true;
    error.value = null;

    try {
      const res = await api.group.update(
        {
          name: name.value,
          // Currency is intentionally not configurable in this fork. Preserve
          // the collection's existing value for API compatibility.
          currency: group.value?.currency || selectedCollection.value.currency,
        },
        selectedCollection.value.id
      );

      if (res.error || !res.data) {
        const msg = t("profile.toast.failed_update_group");
        error.value = msg;
        toast.error(msg);
        return;
      }

      group.value = res.data;
      toast.success(t("profile.toast.group_updated"));

      await reloadCollections();
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      error.value = msg;
      toast.error(msg);
    } finally {
      saving.value = false;
    }
  };
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="rounded-md border bg-card p-4 text-sm text-muted-foreground">
      {{ $t("global.loading") }}
    </div>

    <div v-else>
      <div v-if="!selectedCollection" class="rounded-md border bg-card p-4 text-sm text-muted-foreground">
        {{ $t("components.collection.selector.select_collection") }}
      </div>

      <div v-else class="space-y-4 rounded-md border bg-card p-4">
        <FormTextField v-model="name" :label="$t('global.name')" />

        <div class="mt-4">
          <Button variant="secondary" size="sm" :disabled="saving" @click="save">
            <MdiLoading v-if="saving" class="mr-2 inline-block animate-spin" />
            <span>{{ $t("profile.update_group") }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
