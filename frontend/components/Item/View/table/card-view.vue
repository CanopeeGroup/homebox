<script setup lang="ts">
  import ItemCard from "@/components/Item/Card.vue";
  import type { EntitySummary } from "~/lib/api/types/data-contracts";
  import type { Table as TableType } from "@tanstack/vue-table";
  import MdiSelectSearch from "~icons/mdi/select-search";
  import MdiPencil from "~icons/mdi/pencil";
  import { Checkbox } from "@/components/ui/checkbox";
  import { Button } from "@/components/ui/button";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { toast } from "@/components/ui/sonner";
  import DropdownAction from "./data-table-dropdown.vue";

  const preferences = useViewPreferences();

  const props = defineProps<{
    table: TableType<EntitySummary>;
    locationFlatTree?: FlatTreeItem[];
    compactList?: boolean;
  }>();

  const emit = defineEmits<{
    (e: "refresh"): void;
  }>();

  const api = useUserApi();
  const quantityDialogOpen = ref(false);
  const quantityItem = ref<EntitySummary | null>(null);
  const editedQuantity = ref(0);
  const savingQuantity = ref(false);

  function openQuantityEditor(item: EntitySummary) {
    quantityItem.value = item;
    editedQuantity.value = item.quantity;
    quantityDialogOpen.value = true;
  }

  async function saveQuantity() {
    if (!quantityItem.value || !Number.isFinite(editedQuantity.value) || editedQuantity.value < 0) return;

    savingQuantity.value = true;
    const { error } = await api.items.patch(quantityItem.value.id, {
      quantity: editedQuantity.value,
    });
    savingQuantity.value = false;

    if (error) {
      toast.error("Impossible de modifier la quantité.");
      return;
    }

    quantityDialogOpen.value = false;
    toast.success("Quantité modifiée.");
    emit("refresh");
  }

  const selectedCount = computed(() => props.table.getSelectedRowModel().rows.length);
</script>

<template>
  <Dialog v-model:open="quantityDialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t("global.quantity") }} — {{ quantityItem?.name }}</DialogTitle>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="saveQuantity">
        <div class="flex flex-col gap-2">
          <Label for="direct-item-quantity">{{ $t("global.quantity") }}</Label>
          <Input
            id="direct-item-quantity"
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
  </Dialog>

  <Teleport to="#selectable-subtitle" defer>
    <Checkbox
      class="size-6 p-0"
      :model-value="
        table.getIsAllPageRowsSelected() ? true : table.getSelectedRowModel().rows.length > 0 ? 'indeterminate' : false
      "
      :aria-label="$t('components.item.view.selectable.select_all')"
      @update:model-value="table.toggleAllPageRowsSelected(!!$event)"
    />

    <div class="grow" />

    <div :class="['relative inline-flex items-center', selectedCount === 0 ? 'pointer-events-none opacity-50' : '']">
      <DropdownAction
        :delete-only="compactList"
        :multi="{ items: table.getSelectedRowModel().rows, columns: table.getAllColumns() }"
        view="card"
        :table="table"
        @refresh="$emit('refresh')"
      />

      <span v-if="selectedCount > 0" class="absolute -right-1 -top-1 flex size-4">
        <span
          class="pointer-events-none relative flex size-4 items-center justify-center whitespace-nowrap rounded-full bg-primary p-1 text-xs text-primary-foreground"
        >
          {{ String(selectedCount) }}
        </span>
      </span>
    </div>
  </Teleport>
  <div v-if="table.getRowModel().rows?.length === 0" class="flex flex-col items-center gap-2">
    <MdiSelectSearch class="size-10" />
    <p>{{ $t("items.no_results") }}</p>
  </div>
  <ul v-else-if="compactList" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <li
      v-for="row in table.getRowModel().rows"
      :key="row.original.id"
      class="flex min-h-24 items-start gap-3 rounded-lg border bg-background p-4 shadow-sm transition-colors hover:border-primary/50"
      :class="{ 'border-primary ring-2 ring-primary/30': row.getIsSelected() }"
    >
      <Checkbox
        v-if="compactList || preferences.quickActions.enabled"
        class="mt-1 shrink-0"
        :model-value="row.getIsSelected()"
        :aria-label="$t('components.item.view.selectable.select_row')"
        @update:model-value="row.toggleSelected(!!$event)"
      />
      <div class="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
        <NuxtLink :to="`/item/${row.original.id}`" class="break-words text-base font-medium leading-snug hover:underline">
          {{ row.original.name }}
        </NuxtLink>
        <div class="mt-auto flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted-foreground">
            {{ $t("items.quantity") }} : {{ row.original.quantity }}
          </span>
          <Button size="sm" variant="outline" class="ml-auto h-8" @click="openQuantityEditor(row.original)">
            <MdiPencil class="mr-1 size-4" />
            {{ $t("global.edit") }}
          </Button>
        </div>
      </div>
    </li>
  </ul>
  <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    <ItemCard
      v-for="item in table.getRowModel().rows"
      :key="item.original.id"
      :item="item.original"
      :table-row="preferences.quickActions.enabled ? item : undefined"
      :location-flat-tree="locationFlatTree"
    />
  </div>
</template>
