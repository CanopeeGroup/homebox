<template>
  <BaseModal :dialog-id="DialogID.CreateTemplate" :title="$t('components.template.create_modal.title')">
    <form class="flex min-w-0 flex-col gap-2" @submit.prevent="create()">
      <FormTextField
        v-model="form.name"
        :autofocus="true"
        :label="$t('components.template.form.template_name')"
        :max-length="255"
        :min-length="1"
      />
      <Separator class="my-2" />
      <h3 class="text-sm font-medium">{{ $t("components.template.form.default_item_values") }}</h3>
      <FormTextField v-model="form.defaultName" :label="$t('components.template.form.item_name')" :max-length="255" />
      <FormTextField
        v-model="form.defaultModelNumber"
        :label="$t('components.template.form.model_number')"
        :max-length="255"
      />

      <div class="mt-4 flex justify-end">
        <Button type="submit" :loading="loading">{{ $t("global.create") }}</Button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import { DialogID } from "@/components/ui/dialog-provider/utils";
  import BaseModal from "@/components/App/CreateModal.vue";
  import { useDialog } from "~/components/ui/dialog-provider";
  import FormTextField from "~/components/Form/TextField.vue";
  import { Button } from "~/components/ui/button";
  import { Separator } from "@/components/ui/separator";
  import type { EntityTemplateCreate } from "~~/lib/api/types/data-contracts";

  const emit = defineEmits<{ created: [] }>();
  const { closeDialog } = useDialog();

  const loading = ref(false);
  const form = reactive({
    name: "",
    defaultName: "",
    defaultModelNumber: "",
  });

  function reset() {
    Object.assign(form, { name: "", defaultName: "", defaultModelNumber: "" });
    loading.value = false;
  }

  const api = useUserApi();

  const { t } = useI18n();

  async function create() {
    if (loading.value) return;
    loading.value = true;

    // Prepare the data with proper format for API
    const createData: EntityTemplateCreate = {
      name: form.name,
      description: "",
      notes: "",
      defaultName: form.defaultName || null,
      defaultDescription: null,
      defaultQuantity: 0,
      defaultInsured: false,
      defaultManufacturer: null,
      defaultModelNumber: form.defaultModelNumber || null,
      defaultLifetimeWarranty: false,
      defaultWarrantyDetails: null,
      defaultLocationId: null,
      defaultTagIds: [],
      includeWarrantyFields: false,
      includePurchaseFields: false,
      includeSoldFields: false,
      fields: [],
    };

    const { error } = await api.templates.create(createData);
    if (error) {
      toast.error(t("components.template.toast.create_failed"));
      loading.value = false;
      return;
    }

    toast.success(t("components.template.toast.created"));
    reset();
    closeDialog(DialogID.CreateTemplate);
    emit("created");
  }
</script>
