<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import type { AnyDetail, Details } from "~~/components/global/DetailsSection/types";
  import { filterZeroValues } from "~~/components/global/DetailsSection/types";
  import MdiArrowLeft from "~icons/mdi/arrow-left";
  import MdiPlus from "~icons/mdi/plus";
  import MdiMinus from "~icons/mdi/minus";
  import MdiDelete from "~icons/mdi/delete";
  import MdiPlusBoxMultipleOutline from "~icons/mdi/plus-box-multiple-outline";
  import MdiContentSaveEdit from "~icons/mdi/content-save-edit";
  import MdiDotsVertical from "~icons/mdi/dots-vertical";
  import MdiPencil from "~icons/mdi/pencil";
  import { Separator } from "@/components/ui/separator";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
  } from "@/components/ui/breadcrumb";
  import { Button, ButtonGroup } from "@/components/ui/button";
  import { useDialog } from "@/components/ui/dialog-provider";
  import { Card } from "@/components/ui/card";
  import { DialogID } from "~/components/ui/dialog-provider/utils";
  import BaseContainer from "@/components/Base/Container.vue";
  import ItemImageDialog from "~/components/Item/ImageDialog.vue";
  import ItemDuplicateSettings from "~/components/Item/DuplicateSettings.vue";
  import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { DialogRoot } from "reka-ui";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import DateTime from "~/components/global/DateTime.vue";
  import Markdown from "~/components/global/Markdown.vue";
  import BaseCard from "@/components/Base/Card.vue";
  import DetailsSection from "~/components/global/DetailsSection/DetailsSection.vue";
  import ItemViewSelectable from "~/components/Item/View/Selectable.vue";

  const { t } = useI18n();

  const { openDialog, closeDialog } = useDialog();

  definePageMeta({
    middleware: ["auth"],
  });

  const route = useRoute();
  const api = useUserApi();
  const { updateQuantity: updateCachedLocationQuantity } = useLocationItemCache();

  const itemId = computed<string>(() => route.params.id as string);
  const preferences = useViewPreferences();

  function goBack() {
    if (window.history.state?.back) {
      window.history.back();
      return;
    }
    navigateTo("/locations");
  }

  const temporaryDuplicateSettings = ref<DuplicateSettings>({
    copyMaintenance: preferences.value.duplicateSettings.copyMaintenance,
    copyAttachments: preferences.value.duplicateSettings.copyAttachments,
    copyCustomFields: preferences.value.duplicateSettings.copyCustomFields,
    copyPrefixOverride: preferences.value.duplicateSettings.copyPrefixOverride,
  });

  const hasNested = computed<boolean>(() => {
    return route.fullPath.split("/").at(-1) !== itemId.value;
  });

  const { data: item, refresh } = useAsyncData(itemId.value, async () => {
    const { data, error } = await api.items.get(itemId.value);
    if (error) {
      toast.error(t("items.toast.failed_load_item"));
      navigateTo("/locations");
      return;
    }
    return data;
  });
  onMounted(() => {
    refresh();
  });

  const lastRoute = ref(route.fullPath);
  watchEffect(() => {
    if (lastRoute.value.endsWith("edit")) {
      refresh();
    }

    lastRoute.value = route.fullPath;
  });

  const quantityDialogOpen = ref(false);
  const editedQuantity = ref(0);
  const savingQuantity = ref(false);

  function openQuantityEditor() {
    if (!item.value) return;
    editedQuantity.value = item.value.quantity;
    quantityDialogOpen.value = true;
  }

  async function saveQuantity() {
    if (!item.value || !Number.isFinite(editedQuantity.value) || editedQuantity.value < 0) return;

    savingQuantity.value = true;
    const response = await api.items.patch(item.value.id, {
      id: item.value.id,
      quantity: editedQuantity.value,
    });
    savingQuantity.value = false;

    if (response.error) {
      toast.error(t("items.toast.failed_adjust_quantity"));
      return;
    }

    const newQuantity = response.data?.quantity ?? editedQuantity.value;
    if (response.data) item.value = response.data;
    else item.value.quantity = newQuantity;
    updateCachedLocationQuantity(item.value.id, newQuantity);

    quantityDialogOpen.value = false;
    toast.success("Quantité modifiée.");
  }

  async function adjustQuantity(amount: number) {
    if (!item.value) {
      return;
    }

    const newQuantity = item.value.quantity + amount;
    if (newQuantity < 0) {
      toast.error(t("items.toast.quantity_cannot_negative"));
      return;
    }

    const resp = await api.items.patch(item.value.id, {
      id: item.value.id,
      quantity: newQuantity,
    });

    if (resp.error) {
      toast.error(t("items.toast.failed_adjust_quantity"));
      return;
    }

    const updatedQuantity = resp.data?.quantity ?? newQuantity;
    if (resp.data) {
      item.value = resp.data;
    } else {
      item.value.quantity = updatedQuantity;
    }
    updateCachedLocationQuantity(item.value.id, updatedQuantity);
  }

  type Photo = {
    thumbnailSrc?: string;
    originalSrc: string;
    attachmentId: string;
    originalType?: string;
  };

  const photos = computed<Photo[]>(() => {
    if (!item.value) {
      return [];
    }
    return (
      item.value.attachments.reduce((acc, cur) => {
        if (cur.type === "photo") {
          const photo: Photo = {
            originalSrc: api.authURL(`/entities/${item.value!.id}/attachments/${cur.id}`),
            originalType: cur.mimeType,
            attachmentId: cur.id,
          };
          if (cur.thumbnail) {
            photo.thumbnailSrc = api.authURL(`/entities/${item.value!.id}/attachments/${cur.thumbnail.id}`);
          } else {
            photo.thumbnailSrc = photo.originalSrc; // fallback to itself if no thumbnail
          }
          acc.push(photo);
        }
        return acc;
      }, [] as Photo[]) || []
    );
  });

  const itemDetails = computed<Details>(() => {
    if (!item.value) {
      return [];
    }

    const ret: Details = [
      {
        name: "items.quantity",
        text: item.value?.quantity,
        slot: "quantity",
      },
      {
        name: "items.model_number",
        text: item.value?.modelNumber,
      },
      ...item.value.fields.map(field => {
        /**
         * Support Special URL Syntax
         */
        const url = maybeUrl(field.textValue);
        if (url.isUrl) {
          return {
            type: "link",
            name: field.name,
            text: url.text,
            href: url.url,
          } as AnyDetail;
        }

        return {
          name: field.name,
          text: field.textValue,
        };
      }),
    ];

    if (!preferences.value.showEmpty) {
      return filterZeroValues(ret);
    }

    return ret;
  });

  function openImageDialog(img: Photo, itemId: string) {
    openDialog(DialogID.ItemImage, {
      params: {
        type: "preloaded",
        originalSrc: img.originalSrc,
        originalType: img.originalType,
        thumbnailSrc: img.thumbnailSrc,
        attachmentId: img.attachmentId,
        itemId,
      },
      onClose: result => {
        if (result?.action === "delete") {
          item.value!.attachments = item.value!.attachments.filter(a => a.id !== result.id);
        }
      },
    });
  }

  const currentPath = computed(() => {
    return route.path;
  });

  const tabs = computed(() => {
    return [
      {
        id: "details",
        name: "global.details",
        to: `/item/${itemId.value}`,
      },
      {
        id: "edit",
        name: "global.edit",
        to: `/item/${itemId.value}/edit`,
      },
    ];
  });

  const fullpath = computedAsync(async () => {
    if (!item.value) {
      return [];
    }

    const resp = await api.items.fullpath(item.value.id);
    if (resp.error) {
      toast.error(t("items.toast.failed_load_item"));
      return [];
    }

    return resp.data;
  });

  const { data: items, refresh: refreshItemList } = useAsyncData(
    () => itemId.value + "_item_list",
    async () => {
      if (!itemId.value) {
        return [];
      }

      const resp = await api.items.getAll({
        parentIds: [itemId.value],
      });

      if (resp.error) {
        toast.error(t("items.toast.failed_load_items"));
        return [];
      }

      return resp.data.items;
    },
    {
      watch: [itemId],
    }
  );

  async function duplicateItem(settings?: DuplicateSettings) {
    if (!item.value) {
      return;
    }

    const duplicateSettings = settings
      ? {
          copyMaintenance: settings.copyMaintenance,
          copyAttachments: settings.copyAttachments,
          copyCustomFields: settings.copyCustomFields,
          copyPrefix: settings.copyPrefixOverride ?? t("items.duplicate.prefix"),
        }
      : {
          copyMaintenance: preferences.value.duplicateSettings.copyMaintenance,
          copyAttachments: preferences.value.duplicateSettings.copyAttachments,
          copyCustomFields: preferences.value.duplicateSettings.copyCustomFields,
          copyPrefix: preferences.value.duplicateSettings.copyPrefixOverride ?? t("items.duplicate.prefix"),
        };

    const { error, data } = await api.items.duplicate(itemId.value, duplicateSettings);

    if (error) {
      toast.error(t("items.toast.failed_duplicate_item"));
      return;
    }

    navigateTo(`/item/${data.id}`);
  }

  function handleDuplicateClick(event: MouseEvent) {
    if (event.shiftKey) {
      openDialog(DialogID.DuplicateTemporarySettings);
    } else {
      duplicateItem();
    }
  }

  const confirm = useConfirm();

  async function deleteItem() {
    const confirmed = await confirm.open(t("items.delete_item_confirm"));

    if (!confirmed.data) {
      return;
    }

    const { error } = await api.items.delete(itemId.value);
    if (error) {
      toast.error(t("items.toast.failed_delete_item"));
      return;
    }
    toast.success(t("items.toast.item_deleted"));
    navigateTo("/locations");
  }

  async function saveAsTemplate() {
    if (!item.value) {
      return;
    }

    const NIL_UUID = "00000000-0000-0000-0000-000000000000";

    // Create template from item data
    const templateData = {
      name: `Template: ${item.value.name}`,
      description: "",
      notes: "",
      defaultName: item.value.name,
      defaultDescription: item.value.description || "",
      defaultQuantity: item.value.quantity,
      defaultInsured: item.value.insured,
      defaultManufacturer: item.value.manufacturer || "",
      defaultModelNumber: item.value.modelNumber || "",
      defaultLifetimeWarranty: item.value.lifetimeWarranty,
      defaultWarrantyDetails: item.value.warrantyDetails || "",
      defaultLocationId: item.value.location?.id || item.value.parent?.id || "",
      defaultTagIds: item.value.tags?.map(l => l.id) || [],
      includeWarrantyFields: !!(
        item.value.warrantyDetails ||
        item.value.lifetimeWarranty ||
        item.value.warrantyExpires
      ),
      includePurchaseFields: !!(item.value.purchaseFrom || item.value.purchasePrice || item.value.purchaseDate),
      includeSoldFields: !!(item.value.soldTo || item.value.soldPrice || item.value.soldDate),
      fields: item.value.fields.map(field => ({
        id: NIL_UUID,
        name: field.name,
        type: "text",
        textValue: field.textValue || "",
      })),
    };

    const { data, error } = await api.templates.create(templateData);
    if (error) {
      toast.error(t("components.template.toast.create_failed"));
      return;
    }

    toast.success(t("components.template.toast.saved_as_template", { name: templateData.name }));
    navigateTo(`/template/${data.id}`);
  }

  async function createSubitem() {
    openDialog(DialogID.CreateEntity, {
      params: {
        baseType: "item",
        subItem: true,
      },
    });
  }
</script>

<template>
  <BaseContainer v-if="item">
    <!-- set page title -->
    <Title>{{ item.name }}</Title>

    <ItemImageDialog />

    <DialogRoot v-model:open="quantityDialogOpen">
      <DialogContent class="z-[100] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ $t("global.quantity") }} — {{ item.name }}</DialogTitle>
        </DialogHeader>
        <form class="flex flex-col gap-4" @submit.prevent="saveQuantity">
          <div class="flex flex-col gap-2">
            <Label for="item-detail-quantity">{{ $t("global.quantity") }}</Label>
            <Input
              id="item-detail-quantity"
              v-model.number="editedQuantity"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              autofocus
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="quantityDialogOpen = false">
              {{ $t("global.cancel") }}
            </Button>
            <Button type="submit" :disabled="savingQuantity || editedQuantity < 0">
              {{ $t("global.save") }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>

    <Dialog :dialog-id="DialogID.DuplicateTemporarySettings">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ $t("items.duplicate.temporary_title") }}</DialogTitle>
        </DialogHeader>
        <ItemDuplicateSettings v-model="temporaryDuplicateSettings" />
        <DialogFooter>
          <Button
            @click="
              closeDialog(DialogID.DuplicateTemporarySettings);
              duplicateItem(temporaryDuplicateSettings);
            "
          >
            {{ $t("global.duplicate") }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <section>
      <Card class="p-3">
        <header :class="{ 'mb-2': item.description }">
          <div class="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="mb-auto size-12 shrink-0 rounded-full"
              aria-label="Retour à la page précédente"
              title="Retour"
              @click="goBack"
            >
              <MdiArrowLeft class="size-7" />
            </Button>
            <div>
              <Breadcrumb v-if="fullpath && fullpath.length > 0">
                <BreadcrumbList>
                  <BreadcrumbItem v-for="(part, idx) in fullpath" :key="part.id">
                    <BreadcrumbLink
                      v-if="idx < fullpath.length - 1"
                      as-child
                      class="text-foreground/70 hover:underline"
                    >
                      <NuxtLink :to="`/${part.type}/${part.id}`">
                        {{ part.name }}
                      </NuxtLink>
                    </BreadcrumbLink>
                    <template v-else>
                      {{ part.name }}
                    </template>
                    <BreadcrumbSeparator v-if="idx < fullpath.length - 1" :key="`sep-${part.id}`" />
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 class="text-wrap pb-1 text-2xl">
                {{ item ? item.name : "" }}
              </h1>
              <div class="flex flex-wrap gap-1 text-wrap text-xs">
                <div>
                  {{ $t("items.created_at") }}
                  <DateTime :date="item?.createdAt" />
                </div>
                -
                <div>
                  {{ $t("items.updated_at") }}
                  <DateTime :date="item?.updatedAt" />
                </div>
              </div>
            </div>
            <div class="ml-auto mt-2 flex flex-wrap items-center justify-between gap-2">
              <Button class="w-9 md:w-auto" :aria-label="$t('global.create_subitem')" @click="createSubitem">
                <MdiPlus />
                <span class="hidden md:inline">{{ $t("global.create_subitem") }}</span>
              </Button>

              <!-- More actions dropdown -->
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="outline" size="icon" :aria-label="$t('global.more_actions')">
                    <MdiDotsVertical class="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                  <DropdownMenuItem @click="handleDuplicateClick">
                    <MdiPlusBoxMultipleOutline class="mr-2 size-4" />
                    {{ $t("global.duplicate") }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="saveAsTemplate">
                    <MdiContentSaveEdit class="mr-2 size-4" />
                    {{ $t("components.template.save_as_template") }}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem class="text-destructive focus:text-destructive" @click="deleteItem">
                    <MdiDelete class="mr-2 size-4" />
                    {{ $t("global.delete") }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <Separator v-if="item.description" />
        <div v-if="item.description" class="prose max-w-full p-1">
          <Markdown class="text-base" :source="item.description" />
        </div>
      </Card>

      <div class="mb-6 mt-3 flex flex-wrap items-center justify-between">
        <ButtonGroup>
          <Button
            v-for="tab in tabs"
            :key="tab.id"
            as-child
            :variant="tab.to === currentPath ? 'default' : 'outline'"
            size="sm"
          >
            <NuxtLink :to="tab.to">
              {{ $t(tab.name) }}
            </NuxtLink>
          </Button>
        </ButtonGroup>
      </div>
    </section>

    <section>
      <div class="space-y-6">
        <!-- this renders the other pages content -->
        <NuxtPage :item="item" :page-key="itemId" />

        <!-- anything in this is not rendered if on another page -->
        <BaseCard v-if="!hasNested" collapsable>
          <template #title> {{ $t("items.details") }} </template>
          <DetailsSection :details="itemDetails">
            <template #quantity="{ detail }">
              <div class="flex flex-wrap items-center gap-2">
                <span>{{ detail.text }}</span>
                <Button size="sm" variant="outline" @click="openQuantityEditor">
                  <MdiPencil class="mr-1 size-4" />
                  {{ $t("global.edit") }}
                </Button>
                <span class="inline-flex gap-2 opacity-10 transition-opacity duration-75 group-hover:opacity-100">
                  <Button size="icon" variant="outline" class="size-8 rounded-full" @click="adjustQuantity(-1)">
                    <MdiMinus class="size-3" />
                  </Button>
                  <Button size="icon" variant="outline" class="size-8 rounded-full" @click="adjustQuantity(1)">
                    <MdiPlus class="size-3" />
                  </Button>
                </span>
              </div>
            </template>
          </DetailsSection>
        </BaseCard>

        <!-- anything in this is not rendered if on another page -->
        <template v-if="!hasNested">
          <BaseCard v-if="photos && photos.length > 0">
            <template #title> {{ $t("items.photos") }} </template>
            <div class="scroll-bg container mx-auto flex max-h-[500px] flex-wrap gap-2 overflow-y-scroll border-t p-4">
              <button v-for="(img, i) in photos" :key="i" @click="openImageDialog(img, item.id)">
                <img class="max-h-[200px] rounded" :src="img.thumbnailSrc" :alt="$t('items.photo')" loading="lazy" />
              </button>
            </div>
          </BaseCard>
        </template>
      </div>
    </section>

    <section v-if="items && items.length > 0" class="mt-6">
      <ItemViewSelectable :items="items" @refresh="refreshItemList" />
    </section>
  </BaseContainer>
</template>

<style lang="css" scoped>
  /* Style dialog background */
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
