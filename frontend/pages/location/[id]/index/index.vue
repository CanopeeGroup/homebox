<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import type { ItemAttachment, TreeItem } from "~~/lib/api/types/data-contracts";
  import MdiArrowLeft from "~icons/mdi/arrow-left";
  import MdiPlus from "~icons/mdi/plus";
  import MdiPencil from "~icons/mdi/pencil";
  import MdiDelete from "~icons/mdi/delete";
  import { useDialog } from "@/components/ui/dialog-provider";
  import { Card } from "@/components/ui/card";
  import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
  } from "@/components/ui/breadcrumb";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Separator } from "@/components/ui/separator";
  import { DialogID } from "~/components/ui/dialog-provider/utils";
  import BaseCard from "@/components/Base/Card.vue";
  import Currency from "~/components/global/Currency.vue";
  import DateTime from "~/components/global/DateTime.vue";
  import Markdown from "~/components/global/Markdown.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import ItemViewSelectable from "~/components/Item/View/Selectable.vue";
  import ItemAttachmentsList from "~/components/Item/AttachmentsList.vue";
  import ItemImageDialog from "~/components/Item/ImageDialog.vue";
  import LocationCard from "~/components/Location/Card.vue";

  definePageMeta({
    middleware: ["auth"],
  });

  const { t } = useI18n();

  const { openDialog } = useDialog();

  const route = useRoute();
  const api = useUserApi();

  const locationId = computed<string>(() => route.params.id as string);

  // Keep a small in-memory cache while navigating between nested locations.
  // Mobile/tablet users often move parent -> child -> sibling -> back; serving
  // previously visited locations immediately avoids a blank/loading pause while
  // the API refreshes the authoritative copy in the background.
  const LOCATION_PAGE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const locationStore = useLocationStore();
  const locationDetailCache = useState<Record<string, any>>("location-detail-cache", () => ({}));
  const { cache: childLocationCache, removeLocations: removeChildLocationCaches } = useLocationChildCache();
  const { cache: locationItemCache, removeLocations: removeLocationItemCaches } = useLocationItemCache();
  const deletingLocation = ref(false);

  function collectLocationSubtreeIds(id: string) {
    const ids = new Set<string>([id]);

    const collectTree = (node: TreeItem) => {
      if (node.type === "location") ids.add(node.id);
      for (const child of node.children ?? []) collectTree(child);
    };

    const findTreeNode = (nodes: TreeItem[]): boolean => {
      for (const node of nodes) {
        if (node.id === id) {
          collectTree(node);
          return true;
        }
        if (findTreeNode(node.children ?? [])) return true;
      }
      return false;
    };

    findTreeNode(locationStore.tree ?? []);

    // The global tree may not be resident after a long-idle mobile session.
    // Recover any descendants known by the per-page child caches as well.
    const collectCachedChildren = (parentId: string) => {
      for (const child of childLocationCache.value[parentId] ?? []) {
        if (ids.has(child.id)) continue;
        ids.add(child.id);
        collectCachedChildren(child.id);
      }
    };
    collectCachedChildren(id);

    return [...ids];
  }

  async function hydrateLocationPageCache(id: string) {
    if (!id) return;

    const [cachedDetail, cachedChildren, cachedItems] = await Promise.all([
      readPersistentCache<any>(
        persistentCacheKey(`location-detail:${id}`),
        LOCATION_PAGE_CACHE_MAX_AGE_MS
      ),
      readPersistentCache<any[]>(
        persistentCacheKey(`location-children:${id}`),
        LOCATION_PAGE_CACHE_MAX_AGE_MS
      ),
      readPersistentCache<any[]>(
        persistentCacheKey(`location-items:${id}`),
        LOCATION_PAGE_CACHE_MAX_AGE_MS
      ),
    ]);

    if (cachedDetail && !locationDetailCache.value[id]) locationDetailCache.value[id] = cachedDetail;
    if (cachedChildren && !childLocationCache.value[id]) childLocationCache.value[id] = cachedChildren;
    if (cachedItems && !locationItemCache.value[id]) locationItemCache.value[id] = cachedItems;
  }

  // Restore the current location page from IndexedDB before the first API
  // request. This survives long mobile/tablet idle periods where the browser
  // may discard the JavaScript heap while keeping IndexedDB intact.
  await hydrateLocationPageCache(locationId.value);
  const hadCachedLocationPage =
    !!locationDetailCache.value[locationId.value] ||
    !!childLocationCache.value[locationId.value] ||
    !!locationItemCache.value[locationId.value];

  const { data: location, refresh: refreshLocation } = useAsyncData(
    () => `location_${locationId.value}`,
    async () => {
      const id = locationId.value;
      const { data, error } = await api.items.getLocation(id);
      if (error) {
        if (deletingLocation.value) return;

        if (!locationDetailCache.value[id]) {
          toast.error(t("locations.toast.failed_load_location"));
          navigateTo("/locations");
        }
        return locationDetailCache.value[id];
      }

      if (data) {
        locationDetailCache.value[id] = data;
        void writePersistentCache(persistentCacheKey(`location-detail:${id}`), data);
      }
      return data;
    },
    {
      watch: [locationId],
      getCachedData: () => locationDetailCache.value[locationId.value],
    }
  );

  const confirm = useConfirm();

  async function confirmDelete() {
    const { isCanceled } = await confirm.open(t("locations.location_items_delete_confirm"));
    if (isCanceled) return;

    const deletedIds = collectLocationSubtreeIds(locationId.value);
    deletingLocation.value = true;

    const { error } = await api.items.deleteLocation(locationId.value);
    if (error) {
      deletingLocation.value = false;
      toast.error(t("locations.toast.failed_delete_location"));
      return;
    }

    // Remove the deleted subtree from every cache before navigating away.
    // Otherwise IndexedDB/memory can keep rendering a deleted location until
    // a later server refresh returns the new tree.
    locationStore.removeLocations(deletedIds);
    removeChildLocationCaches(deletedIds);
    removeLocationItemCaches(deletedIds);

    for (const id of deletedIds) {
      delete locationDetailCache.value[id];
      void deletePersistentCache(persistentCacheKey(`location-detail:${id}`));
      clearNuxtData(`location_${id}`);
      clearNuxtData(`${id}_child_locations`);
      clearNuxtData(`${id}_item_list`);
    }

    toast.success(t("locations.toast.location_deleted"));
    await navigateTo("/locations");

    // Reconcile the locally-pruned tree with the server after navigation.
    // Force a new request in case a mutation event started a tree refresh while
    // the cascade delete was still running.
    void locationStore.refreshTree(true);
  }

  function openCreateItem() {
    openDialog(DialogID.CreateEntity, {
      params: {
        baseType: "item",
      },
    });
  }

  function goToEdit() {
    navigateTo(`/location/${locationId.value}/edit`);
  }

  function goBack() {
    if (window.history.state?.back) {
      window.history.back();
      return;
    }
    navigateTo("/locations");
  }

  // Photos
  type Photo = {
    thumbnailSrc?: string;
    originalSrc: string;
    attachmentId: string;
    originalType?: string;
  };

  const photos = computed<Photo[]>(() => {
    if (!location.value?.attachments) {
      return [];
    }
    return location.value.attachments.reduce((acc, cur) => {
      if (cur.type === "photo") {
        const photo: Photo = {
          originalSrc: api.authURL(`/entities/${location.value!.id}/attachments/${cur.id}`),
          originalType: cur.mimeType,
          attachmentId: cur.id,
        };
        if (cur.thumbnail) {
          photo.thumbnailSrc = api.authURL(`/entities/${location.value!.id}/attachments/${cur.thumbnail.id}`);
        } else {
          photo.thumbnailSrc = photo.originalSrc;
        }
        acc.push(photo);
      }
      return acc;
    }, [] as Photo[]);
  });

  function openImageDialog(img: Photo, entityId: string) {
    openDialog(DialogID.ItemImage, {
      params: {
        type: "preloaded",
        originalSrc: img.originalSrc,
        originalType: img.originalType,
        thumbnailSrc: img.thumbnailSrc,
        attachmentId: img.attachmentId,
        itemId: entityId,
      },
      onClose: result => {
        if (result?.action === "delete") {
          location.value!.attachments = location.value!.attachments.filter(a => a.id !== result.id);
        }
      },
    });
  }

  // Attachments (non-photo)
  const nonPhotoAttachments = computed(() => {
    if (!location.value?.attachments) {
      return { attachments: [], warranty: [], manuals: [], receipts: [] };
    }
    return location.value.attachments.reduce(
      (acc, attachment) => {
        if (attachment.type === "photo") return acc;
        if (attachment.type === "warranty") acc.warranty.push(attachment);
        else if (attachment.type === "manual") acc.manuals.push(attachment);
        else if (attachment.type === "receipt") acc.receipts.push(attachment);
        else acc.attachments.push(attachment);
        return acc;
      },
      {
        attachments: [] as ItemAttachment[],
        warranty: [] as ItemAttachment[],
        manuals: [] as ItemAttachment[],
        receipts: [] as ItemAttachment[],
      }
    );
  });

  const hasNonPhotoAttachments = computed(() => {
    const a = nonPhotoAttachments.value;
    return a.attachments.length > 0 || a.warranty.length > 0 || a.manuals.length > 0 || a.receipts.length > 0;
  });

  const { data: childLocations, refresh: refreshChildLocations } = useAsyncData(
    () => locationId.value + "_child_locations",
    async () => {
      const id = locationId.value;
      if (!id) return [];

      const resp = await api.items.getAll({
        parentIds: [id],
        isLocation: true,
        orderBy: "name",
      });

      if (resp.error) {
        if (deletingLocation.value) return childLocationCache.value[id] ?? [];
        if (!childLocationCache.value[id]) toast.error(t("locations.toast.failed_load_location"));
        return childLocationCache.value[id] ?? [];
      }

      const data = resp.data.items ?? [];
      childLocationCache.value[id] = data;
      void writePersistentCache(persistentCacheKey(`location-children:${id}`), data);
      return data;
    },
    {
      watch: [locationId],
      getCachedData: () => childLocationCache.value[locationId.value],
    }
  );

  const { data: items, refresh: refreshItemList } = useAsyncData(
    () => locationId.value + "_item_list",
    async () => {
      const id = locationId.value;
      if (!id) return [];

      const resp = await api.items.getAll({
        parentIds: [id],
      });

      if (resp.error) {
        if (deletingLocation.value) return locationItemCache.value[id] ?? [];
        if (!locationItemCache.value[id]) toast.error(t("items.toast.failed_load_items"));
        return locationItemCache.value[id] ?? [];
      }

      const data = resp.data.items;
      locationItemCache.value[id] = data;
      void writePersistentCache(persistentCacheKey(`location-items:${id}`), data);
      return data;
    },
    {
      watch: [locationId],
      getCachedData: () => locationItemCache.value[locationId.value],
    }
  );

  watch(locationId, async id => {
    await hydrateLocationPageCache(id);

    // Make the persistent copy visible immediately on route changes. The
    // useAsyncData requests still run and replace it with fresh server data.
    if (locationDetailCache.value[id]) location.value = locationDetailCache.value[id];
    if (childLocationCache.value[id]) childLocations.value = childLocationCache.value[id];
    if (locationItemCache.value[id]) items.value = locationItemCache.value[id];
  });

  onMounted(() => {
    if (!hadCachedLocationPage) return;

    // IndexedDB is display-first, not authoritative. Revalidate silently in
    // the background so a long-idle tab feels instant but still converges on
    // the latest server state.
    void Promise.all([refreshLocation(), refreshChildLocations(), refreshItemList()]);
  });
</script>

<template>
  <div>
    <ItemImageDialog />

    <div v-if="location">
      <!-- set page title -->
      <Title>{{ location.name }}</Title>

      <!-- Photo gallery -->
      <section v-if="photos.length > 0" class="mb-4">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          <button
            v-for="(photo, i) in photos"
            :key="i"
            class="group relative aspect-1 h-32 overflow-hidden rounded-lg border bg-muted"
            @click="openImageDialog(photo, location.id)"
          >
            <img
              :src="photo.thumbnailSrc || photo.originalSrc"
              :alt="location.name"
              class="size-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        </div>
      </section>

      <Card class="p-3">
        <header :class="{ 'mb-2': location?.description }">
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
              <Breadcrumb v-if="location?.parent">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink as-child class="text-foreground/70 hover:underline">
                      <NuxtLink :to="`/location/${location.parent.id}`">
                        {{ location.parent.name }}
                      </NuxtLink>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem> {{ location.name }} </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 class="flex items-center gap-3 pb-1 text-2xl">
                {{ location ? location.name : "" }}

                <Badge v-if="location && location.totalPrice" variant="secondary">
                  <Currency :amount="location.totalPrice" />
                </Badge>
              </h1>
              <div class="flex flex-wrap gap-1 text-xs">
                <div>
                  {{ $t("global.created") }}
                  <DateTime :date="location?.createdAt" />
                </div>
              </div>
            </div>
            <div class="ml-auto mt-2 flex flex-wrap items-center justify-between gap-2">
              <Button class="w-9 md:w-auto" @click="openCreateItem">
                <MdiPlus name="mdi-plus" />
                <span class="hidden md:inline">
                  {{ $t("components.location.create_item") }}
                </span>
              </Button>
              <Button class="w-9 md:w-auto" @click="goToEdit">
                <MdiPencil name="mdi-pencil" />
                <span class="hidden md:inline">
                  {{ $t("global.edit") }}
                </span>
              </Button>
              <Button variant="destructive" class="w-9 md:w-auto" @click="confirmDelete()">
                <MdiDelete name="mdi-delete" />
                <span class="hidden md:inline">
                  {{ $t("global.delete") }}
                </span>
              </Button>
            </div>
          </div>
        </header>
        <Separator v-if="location && location.description" />
        <Markdown v-if="location && location.description" class="mt-3 text-base" :source="location.description" />
      </Card>

      <!-- Attachments (non-photo) -->
      <BaseCard v-if="hasNonPhotoAttachments" class="mt-4">
        <template #title> {{ $t("items.attachments") }} </template>
        <div class="border-t px-4 py-2">
          <ItemAttachmentsList
            v-if="nonPhotoAttachments.attachments.length > 0"
            :attachments="nonPhotoAttachments.attachments"
            :item-id="location.id"
          />
          <ItemAttachmentsList
            v-if="nonPhotoAttachments.warranty.length > 0"
            :attachments="nonPhotoAttachments.warranty"
            :item-id="location.id"
          />
          <ItemAttachmentsList
            v-if="nonPhotoAttachments.manuals.length > 0"
            :attachments="nonPhotoAttachments.manuals"
            :item-id="location.id"
          />
          <ItemAttachmentsList
            v-if="nonPhotoAttachments.receipts.length > 0"
            :attachments="nonPhotoAttachments.receipts"
            :item-id="location.id"
          />
        </div>
      </BaseCard>

      <!-- Child locations -->
      <section v-if="childLocations && childLocations.length > 0" class="mt-6">
        <BaseSectionHeader class="mb-5"> {{ $t("locations.child_locations") }} </BaseSectionHeader>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <LocationCard v-for="child in childLocations" :key="child.id" :location="child" />
        </div>
      </section>

      <!-- Items in this location -->
      <section v-if="location && items" class="mt-6">
        <ItemViewSelectable :items="items" compact-list @refresh="refreshItemList" />
      </section>
    </div>
  </div>
</template>
