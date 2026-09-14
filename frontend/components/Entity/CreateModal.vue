<template>
  <BaseModal :dialog-id="DialogID.CreateEntity">
    <template #title>
      <span>{{ isLocationCreation ? $t("menu.create_location") : $t("menu.create_object") }}</span>
    </template>
    <form class="flex min-w-0 flex-col gap-2" @submit.prevent="submitCreate">
      <TemplateSelector
        v-if="!isLocationCreation"
        v-model="selectedTemplate"
        @template-selected="handleTemplateSelected"
      />
      <LocationSelector v-model="form.location" />

      <!-- Template Info Display - Collapsible banner with distinct styling -->
      <div v-if="templateData" class="rounded-lg border-l-4 border-l-primary bg-primary/5 p-3">
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-1 items-start gap-2">
            <MdiFileDocumentOutline class="mt-0.5 size-4 shrink-0 text-primary" />
            <div class="flex-1">
              <h4 class="text-sm font-medium text-foreground">
                {{ $t("components.template.using_template", { name: templateData.name }) }}
              </h4>
              <button
                type="button"
                class="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                @click="showTemplateDetails = !showTemplateDetails"
              >
                <span v-if="!showTemplateDetails">{{ $t("components.template.show_defaults") }}</span>
                <span v-else>{{ $t("components.template.hide_defaults") }}</span>
                <MdiChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': showTemplateDetails }" />
              </button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-7 shrink-0"
            :aria-label="$t('components.entity.create_modal.clear_template')"
            @click="clearTemplate"
          >
            <MdiClose class="size-4" />
          </Button>
        </div>

        <!-- Collapsible details section -->
        <div v-if="showTemplateDetails" class="mt-3 border-t border-primary/20 pt-3">
          <div class="flex flex-col gap-2 text-xs text-muted-foreground">
            <p v-if="templateData.description" class="text-foreground/80">{{ templateData.description }}</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
              <div v-if="templateData.defaultName">
                <span class="font-medium">{{ $t("global.name") }}:</span> {{ templateData.defaultName }}
              </div>
              <div>
                <span class="font-medium">{{ $t("global.quantity") }}:</span> {{ templateData.defaultQuantity }}
              </div>
              <div>
                <span class="font-medium">{{ $t("global.insured") }}:</span>
                {{ templateData.defaultInsured ? $t("global.yes") : $t("global.no") }}
              </div>
              <div v-if="templateData.defaultManufacturer">
                <span class="font-medium">{{ $t("components.template.form.manufacturer") }}:</span>
                {{ templateData.defaultManufacturer }}
              </div>
              <div v-if="templateData.defaultModelNumber">
                <span class="font-medium">{{ $t("components.template.form.model_number") }}:</span>
                {{ templateData.defaultModelNumber }}
              </div>
              <div v-if="templateData.defaultLifetimeWarranty">
                <span class="font-medium">{{ $t("components.template.form.lifetime_warranty") }}:</span>
                {{ $t("global.yes") }}
              </div>
              <div v-if="templateData.defaultLocation">
                <span class="font-medium">{{ $t("components.template.form.location") }}:</span>
                {{ templateData.defaultLocation.name }}
              </div>
            </div>
            <div v-if="templateData.defaultDescription" class="mt-1">
              <p class="font-medium">{{ $t("components.template.form.item_description") }}:</p>
              <p class="ml-2">{{ templateData.defaultDescription }}</p>
            </div>
            <div v-if="templateData.fields && templateData.fields.length > 0" class="mt-1">
              <p class="font-medium">{{ $t("components.template.form.custom_fields") }}:</p>
              <ul class="ml-4 flex list-none flex-col gap-1">
                <li v-for="field in templateData.fields" :key="field.id">
                  <span class="font-medium">{{ field.name }}:</span>
                  <span> {{ field.textValue || $t("components.template.empty_value") }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <ItemSelector
        v-if="subItemCreate"
        v-model="parent"
        v-model:search="query"
        :label="$t('components.entity.create_modal.parent_item')"
        :items="results"
        item-text="name"
        :no-results-text="$t('components.entity.create_modal.item_selector_no_results_text')"
        :is-loading="isLoading"
        :trigger-search="triggerSearch"
      />
      <FormTextField
        ref="nameInput"
        v-model="form.name"
        :trigger-focus="focused"
        :autofocus="true"
        :label="
          isLocationCreation
            ? $t('components.location.create_modal.location_name')
            : $t('components.item.create_modal.item_name')
        "
        :max-length="255"
        :min-length="1"
      />
      <FormTextField
        v-if="!isLocationCreation"
        v-model.number="form.quantity"
        :label="$t('components.item.create_modal.item_quantity')"
        type="number"
        step="any"
        :min="0"
      />
      <FormTextField
        v-if="!isLocationCreation && !selectedTemplate && !templateData"
        v-model="form.modelNumber"
        :label="$t('items.model_number')"
        :max-length="255"
      />
      <div class="mt-4 flex flex-row-reverse">
        <Button :disabled="loading || initializing" type="submit" class="group" data-entity-create-submit="true">
          <div class="relative mx-2">
            <div
              class="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:rotate-[360deg]"
            >
              <MdiPackageVariant class="size-5 group-hover:hidden" />
              <MdiPackageVariantClosed class="hidden size-5 group-hover:block" />
            </div>
          </div>
          {{ $t("global.create") }}
        </Button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { DialogID } from "@/components/ui/dialog-provider/utils";
  import { toast } from "@/components/ui/sonner";
  import { Button } from "~/components/ui/button";
  import BaseModal from "@/components/App/CreateModal.vue";
  import type {
    EntityCreate,
    EntityTemplateOut,
    EntityTemplateSummary,
    EntityOut,
    EntityTypeSummary,
  } from "~~/lib/api/types/data-contracts";
  import { useLocationStore } from "~~/stores/locations";
  import MdiPackageVariant from "~icons/mdi/package-variant";
  import MdiPackageVariantClosed from "~icons/mdi/package-variant-closed";
  import MdiFileDocumentOutline from "~icons/mdi/file-document-outline";
  import MdiChevronDown from "~icons/mdi/chevron-down";
  import MdiClose from "~icons/mdi/close";
  import { AttachmentTypes } from "~~/lib/api/types/non-generated";
  import { useDialog, useDialogHotkey } from "~/components/ui/dialog-provider";
  import ItemSelector from "~/components/Item/Selector.vue";
  import TemplateSelector from "~/components/Template/Selector.vue";
  import LocationSelector from "~/components/Location/Selector.vue";
  import FormTextField from "~/components/Form/TextField.vue";
  import { dataURLtoFile, type PhotoPreview } from "~/components/Form/photo-uploader";
  import { useEntityTypeStore } from "~~/stores/entityTypes";

  const { t } = useI18n();
  const { closeDialog, registerOpenDialogCallback } = useDialog();

  useDialogHotkey(DialogID.CreateEntity, { code: "Digit1", shift: true }, () => ({
    baseType: "item",
  }));
  useDialogHotkey(DialogID.CreateEntity, { code: "Digit2", shift: true }, () => ({
    baseType: "location",
  }));

  const entityTypeStore = useEntityTypeStore();

  const api = useUserApi();

  const locationsStore = useLocationStore();
  const locations = computed(() => locationsStore.allLocations);

  const route = useRoute();

  const parent = ref();
  const { query, results, isLoading, triggerSearch } = useItemSearch(api, { immediate: false });
  const subItemCreate = ref();

  const locationId = computed(() => {
    if (route.fullPath.includes("/location/")) {
      return route.params.id;
    }
    return null;
  });

  const itemId = computed(() => {
    if (route.fullPath.includes("/item/")) {
      return route.params.id;
    }
    return null;
  });

  const nameInput = ref<HTMLInputElement | null>(null);

  // Entity type selection
  const entityTypes = computed(() => entityTypeStore.allTypes);
  const selectedEntityType = ref<EntityTypeSummary | null>(null);
  const requestedBaseType = ref<"item" | "location">("item");
  const isLocationCreation = computed(() => requestedBaseType.value === "location");
  const initializing = ref(false);
  const entityTypeName = computed(() => (isLocationCreation.value ? t("menu.create_location") : t("menu.create_item")));

  const LAST_TEMPLATE_KEY = "homebox:lastUsedTemplate";

  const loading = ref(false);
  const focused = ref(false);
  const selectedTemplate = ref<EntityTemplateSummary | null>(null);
  const templateData = ref<EntityTemplateOut | null>(null);
  // Tracks whether the current template was chosen explicitly by the user (vs.
  // auto-applied from an entity type's default template). User selections win.
  const templateUserSelected = ref(false);
  const showTemplateDetails = ref(false);
  const form = reactive({
    location: {} as EntityOut,
    parentId: null,
    name: "",
    quantity: 0,
    description: "",
    color: "",
    // Populated by the barcode product-import flow; passed through on create (#1578).
    manufacturer: "",
    modelNumber: "",
    tags: [] as string[],
    photos: [] as PhotoPreview[],
  });

  async function handleTemplateSelected(template: EntityTemplateSummary | null) {
    if (!template) {
      // Template was deselected, clear template data and remove from storage
      templateData.value = null;
      templateUserSelected.value = false;
      form.quantity = 0;
      localStorage.removeItem(LAST_TEMPLATE_KEY);
      return;
    }

    templateUserSelected.value = true;

    // Load full template details
    const { data, error } = await api.templates.get(template.id);
    if (error || !data) {
      toast.error(t("components.template.toast.load_failed"));
      return;
    }

    // Store template data for display and item creation
    templateData.value = data;

    // Pre-fill form with template defaults
    form.quantity = data.defaultQuantity;
    if (data.defaultName) {
      form.name = data.defaultName;
    }
    if (data.defaultDescription) {
      form.description = data.defaultDescription;
    }
    // Pre-fill location if template has one and current form doesn't
    if (data.defaultLocation && !form.location?.id) {
      const found = locations.value.find(l => l.id === data.defaultLocation!.id);
      if (found) {
        form.location = found;
      }
    }

    // Save template ID to localStorage for persistence
    localStorage.setItem(LAST_TEMPLATE_KEY, template.id);
  }

  async function restoreLastTemplate() {
    const lastTemplateId = localStorage.getItem(LAST_TEMPLATE_KEY);
    if (!lastTemplateId) return;

    // Load the template details
    const { data, error } = await api.templates.get(lastTemplateId);
    if (error || !data) {
      // Template might have been deleted, clear the stored ID
      localStorage.removeItem(LAST_TEMPLATE_KEY);
      return;
    }

    // Set the template. A restored template reflects the user's last explicit
    // choice, so treat it as user-selected for override purposes.
    selectedTemplate.value = { id: data.id, name: data.name, description: data.description } as EntityTemplateSummary;
    templateData.value = data;
    templateUserSelected.value = true;
    form.quantity = data.defaultQuantity;
    if (data.defaultName) {
      form.name = data.defaultName;
    }
    if (data.defaultDescription) {
      form.description = data.defaultDescription;
    }
    // Pre-fill location if template has one
    if (data.defaultLocation) {
      const found = locations.value.find(l => l.id === data.defaultLocation!.id);
      if (found) {
        form.location = found;
      }
    }
  }

  function clearTemplate() {
    selectedTemplate.value = null;
    templateData.value = null;
    templateUserSelected.value = false;
    showTemplateDetails.value = false;
    form.quantity = 0;
    localStorage.removeItem(LAST_TEMPLATE_KEY);
  }

  watch(
    parent,
    newParent => {
      if (newParent && newParent.id && subItemCreate.value) {
        form.parentId = newParent.id;
      } else {
        form.parentId = null;
      }
    },
    { immediate: true }
  );

  const { shift } = useMagicKeys();

  function submitCreate(event: SubmitEvent) {
    const submitter = event.submitter as HTMLElement | null;
    if (submitter?.dataset.entityCreateSubmit === "true") {
      void create();
    }
  }

  function appendPhotos(photos: PhotoPreview[]) {
    form.photos.push(...photos);
  }

  onMounted(() => {
    const cleanup = registerOpenDialogCallback(DialogID.CreateEntity, async params => {
      params = params ?? { baseType: "item" };
      // Set the requested mode synchronously, before fetching entity types.
      requestedBaseType.value = params.baseType;
      selectedEntityType.value = null;
      clearTemplate();
      form.name = "";
      form.modelNumber = "";
      form.location = {} as EntityOut;
      initializing.value = true;
      try {
        await entityTypeStore.refresh();
      } catch {
        toast.error(t("components.entity.create_modal.toast.create_failed", { type: entityTypeName.value }));
        return;
      } finally {
        initializing.value = false;
      }
      subItemCreate.value = false;
      let parentItemLocationId = null;
      parent.value = {};
      form.parentId = null;

      if (params.baseType === "item") {
        selectedEntityType.value = entityTypes.value.find(t => !t.isLocation) || null;

        subItemCreate.value = params.subItem;

        if (subItemCreate.value && itemId.value) {
          const itemIdRead = typeof itemId.value === "string" ? (itemId.value as string) : itemId.value[0]!;
          const { data, error } = await api.items.get(itemIdRead);
          if (error || !data) {
            toast.error(t("components.entity.create_modal.toast.failed_load_parent"));
            console.error("Parent item fetch error:", error);
          }

          if (data) {
            parent.value = data;
          }

          if (data.parent) {
            const loc = data.parent;
            parentItemLocationId = loc.id;
          }
        }

        if (params.product) {
          form.name = params.product.item.name;
          form.description = params.product.item.description;
          // Carry the looked-up identifications into the create payload so the
          // created item isn't missing manufacturer/model (#1578).
          form.manufacturer = params.product.manufacturer ?? "";
          form.modelNumber = params.product.modelNumber ?? "";

          if (params.product.imageURL) {
            appendPhotos([
              {
                photoName: "product_view.jpg",
                fileBase64: params.product.imageBase64,
                primary: form.photos.length === 0,
                file: dataURLtoFile(params.product.imageBase64, "product_view.jpg"),
              },
            ]);
          }
        } else {
          // Restore last used template if available. Skipped for barcode
          // product imports: a template's defaults (name, quantity, …) would
          // clobber the just-looked-up product data, and the template create
          // endpoint has no way to carry manufacturer/model (#1578).
          await restoreLastTemplate();
        }
      } else {
        selectedEntityType.value = entityTypes.value.find(t => t.isLocation) || null;
      }

      const locId = locationId.value ? locationId.value : parentItemLocationId;

      if (locId) {
        const found = locations.value.find(l => l.id === locId);
        if (found) {
          form.location = found;
        }
      }
    });

    onUnmounted(cleanup);
  });

  async function create(close = true) {
    if (initializing.value) return;
    // An empty entityTypeId serializes to "" and fails UUID unmarshalling on the
    // backend, so block creation up front rather than firing a doomed request.
    if (!selectedEntityType.value?.id) {
      toast.error(t("components.entity.create_modal.toast.please_select_entity_type"));
      return;
    }

    // Items must live somewhere, but a top-level location has no parent, so the
    // parent location selector is optional when creating a location.
    if (!selectedEntityType.value?.isLocation && !form.location?.id) {
      toast.error(t("components.entity.create_modal.toast.please_select_location"));
      return;
    }

    if (loading.value) {
      toast.error(
        t("components.entity.create_modal.toast.already_creating", {
          type: entityTypeName.value,
        })
      );
      return;
    }

    loading.value = true;

    if (shift?.value) close = false;

    let error, data;

    // If the selected entity type is a location, use the location creation endpoint
    if (selectedEntityType.value?.isLocation) {
      const result = await api.items.createLocation({
        name: form.name,
        description: form.description,
        parentId: form.location?.id || null,
        entityTypeId: selectedEntityType.value?.id || "",
        quantity: 1,
        tagIds: [],
      });
      error = result.error;
      data = result.data;
    } else if (templateData.value) {
      // If a template is selected, use the template creation endpoint
      const templateRequest = {
        name: form.name,
        description: form.description,
        parentId: form.location.id as string,
        tagIds: [],
        quantity: form.quantity,
        entityTypeId: selectedEntityType.value?.id || "",
      };

      const result = await api.templates.createItem(templateData.value.id, templateRequest);
      error = result.error;
      data = result.data;
    } else {
      // Normal item creation without template
      const out: EntityCreate = {
        parentId: form.parentId || (form.location.id as string),
        name: form.name,
        quantity: form.quantity,
        description: form.description,
        manufacturer: form.manufacturer,
        modelNumber: form.modelNumber,
        tagIds: [],
        entityTypeId: selectedEntityType.value?.id || "",
      };

      const result = await api.items.create(out);
      error = result.error;
      data = result.data;
    }

    if (error) {
      loading.value = false;
      toast.error(
        t("components.entity.create_modal.toast.create_failed", {
          type: entityTypeName.value,
        })
      );
      return;
    }

    if (!selectedEntityType.value?.isLocation) {
      toast.success(
        t("components.entity.create_modal.toast.create_success", {
          type: entityTypeName.value,
        })
      );
    }

    if (form.photos.length > 0) {
      for (const photo of form.photos) {
        const { error: attachError } = await api.items.attachments.add(
          data.id,
          photo.file,
          photo.photoName,
          AttachmentTypes.Photo,
          photo.primary
        );

        if (attachError) {
          toast.error(t("components.entity.create_modal.toast.upload_failed", { photoName: photo.photoName }));
          console.error(attachError);
        }
      }
    }

    form.name = "";
    form.quantity = 0;
    form.description = "";
    form.color = "";
    form.manufacturer = "";
    form.modelNumber = "";
    form.photos = [];
    form.tags = [];
    form.parentId = null;
    form.location = {} as EntityOut;
    parent.value = {};
    selectedTemplate.value = null;
    templateData.value = null;
    templateUserSelected.value = false;
    showTemplateDetails.value = false;
    localStorage.removeItem(LAST_TEMPLATE_KEY);
    focused.value = false;
    loading.value = false;

    if (close) {
      closeDialog(DialogID.CreateEntity);
      if (selectedEntityType.value?.isLocation) {
        navigateTo(`/location/${data.id}`);
      } else {
        navigateTo(`/item/${data.id}`);
      }
    } else if (!selectedEntityType.value?.isLocation) {
      // "Create and Add Another" keeps the dialog open, so the open-dialog
      // callback (which normally restores the persisted template) never
      // fires — re-apply it here so the selection isn't cleared (#1489).
      await restoreLastTemplate();
    }
  }
</script>
