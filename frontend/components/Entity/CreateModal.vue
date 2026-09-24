<template>
  <BaseModal :dialog-id="DialogID.CreateEntity" hide-footer>
    <template #title>
      <span>{{ isLocationCreation ? $t("menu.create_location") : $t("menu.create_object") }}</span>
    </template>
    <form class="flex min-w-0 flex-col gap-2" @submit.prevent="submitCreate">
      <div class="flex justify-end">
        <Button :disabled="loading || initializing || (!isLocationCreation && !templateData)" type="submit" class="group" data-entity-create-submit="true">
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
      <TemplateSelector
        v-if="!isLocationCreation"
        v-model="selectedTemplate"
        dialog
        @template-selected="handleTemplateSelected"
      />
      <LocationSelector v-model="form.location" dialog />


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
        v-if="isLocationCreation"
        ref="nameInput"
        v-model="form.name"
        :trigger-focus="focused"
        :autofocus="true"
        :label="$t('components.location.create_modal.location_name')"
        :max-length="255"
        :min-length="1"
      />
      <FormTextField
        v-if="!isLocationCreation"
        v-model="form.quantity"
        :label="$t('components.item.create_modal.item_quantity')"
        type="number"
        step="any"
        :min="0"
      />
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
  const { invalidate: invalidateLocationItemCache } = useLocationItemCache();
  const { adjustItemCount: adjustCachedChildLocationItemCount } = useLocationChildCache();
  const locations = computed(() => locationsStore.allLocations);

  function findLocationInTree(id: string): EntityOut | null {
    const visit = (nodes: typeof locationsStore.tree): EntityOut | null => {
      for (const node of nodes ?? []) {
        if (node.id === id) return node as unknown as EntityOut;
        const found = visit(node.children);
        if (found) return found;
      }
      return null;
    };
    return visit(locationsStore.tree);
  }

  function findLocation(id: string): EntityOut | null {
    return (locations.value.find(location => location.id === id) as unknown as EntityOut | undefined) ?? findLocationInTree(id);
  }

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
    quantity: "" as number | "",
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
      form.quantity = "";
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
    form.name = data.defaultName || data.name;
    if (data.defaultDescription) {
      form.description = data.defaultDescription;
    }
    // Pre-fill location if template has one and current form doesn't
    if (data.defaultLocation && !form.location?.id) {
      const found = findLocation(data.defaultLocation.id);
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
    form.name = data.defaultName || data.name;
    if (data.defaultDescription) {
      form.description = data.defaultDescription;
    }
    // Pre-fill location if template has one
    if (data.defaultLocation) {
      const found = findLocation(data.defaultLocation.id);
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
    form.quantity = "";
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

      // When "New object" is opened from a location page, resolve that location
      // immediately from the already loaded tree. Do not make the user wait for
      // three large location API requests before the form can show its location.
      const routeLocationId = locationId.value
        ? (Array.isArray(locationId.value) ? locationId.value[0] : locationId.value)
        : null;
      if (routeLocationId) {
        const cachedLocation = findLocation(routeLocationId);
        if (cachedLocation) form.location = cachedLocation;
      }

      initializing.value = true;
      try {
        // Entity types are required before creation. Location data is already
        // maintained by the locations page/cache; only fetch the tree if this
        // session has no tree at all. This keeps opening the create form fast.
        const requiredLoads: Promise<unknown>[] = [entityTypeStore.refresh()];
        if (locationsStore.tree === null) requiredLoads.push(locationsStore.refreshTree());
        await Promise.all(requiredLoads);
      } catch {
        toast.error(t("components.entity.create_modal.toast.create_failed", { type: entityTypeName.value }));
        return;
      } finally {
        initializing.value = false;
      }

      // If this was a cold start, the tree may only have become available above.
      if (routeLocationId && !form.location?.id) {
        const loadedLocation = findLocation(routeLocationId);
        if (loadedLocation) form.location = loadedLocation;
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
        const id = Array.isArray(locId) ? locId[0] : locId;
        const found = id ? findLocation(id) : null;
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

    if (!selectedEntityType.value?.isLocation && !templateData.value) {
      toast.error(t("components.template.selector.select"));
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
        quantity: form.quantity === "" ? 0 : Number(form.quantity),
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
        quantity: form.quantity === "" ? 0 : Number(form.quantity),
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

    if (selectedEntityType.value?.isLocation) {
      // A newly created location must immediately become available everywhere:
      // locations page, parent-location selector and subsequent item creation.
      // Do not rely solely on the WebSocket mutation event because it can arrive
      // after navigation (or be unavailable behind some reverse proxies).
      await Promise.all([
        locationsStore.refreshChildren(),
        locationsStore.refreshParents(),
        locationsStore.refreshTree(),
      ]);
    } else {
      // Item lists on location pages are cached for fast mobile navigation.
      // Refresh the current location explicitly after creation so the new item
      // appears immediately, even if the WebSocket mutation event is delayed.
      const createdLocationId = form.parentId ? null : form.location?.id || null;
      if (createdLocationId) {
        // Update every in-memory representation immediately. The location tree
        // and parent-page child cards keep their own cached itemCount values,
        // so refreshing only the item list is not enough.
        locationsStore.adjustItemCount(createdLocationId, 1);
        adjustCachedChildLocationItemCount(createdLocationId, 1);
        invalidateLocationItemCache(createdLocationId);

        const routeLocationId = locationId.value
          ? (Array.isArray(locationId.value) ? locationId.value[0] : locationId.value)
          : null;
        const itemListKey = `${createdLocationId}_item_list`;

        if (routeLocationId === createdLocationId) {
          await refreshNuxtData(itemListKey);
        } else {
          clearNuxtData(itemListKey);
        }

        // Reconcile the optimistic counter with the authoritative server
        // value in the background without delaying the creation flow.
        void locationsStore.refreshTree();
      }

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
    form.quantity = "";
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
      // Keep the user on the current page after creating an item or location.
      // The relevant lists/caches are refreshed above, so navigation is not
      // required to reveal the newly created entity.
      closeDialog(DialogID.CreateEntity);
    } else if (!selectedEntityType.value?.isLocation) {
      // "Create and Add Another" keeps the dialog open, so the open-dialog
      // callback (which normally restores the persisted template) never
      // fires — re-apply it here so the selection isn't cleared (#1489).
      await restoreLastTemplate();
    }
  }
</script>
