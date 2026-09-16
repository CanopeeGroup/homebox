<template>
  <AlertDialog :open="dialog" @update:open="handleOpenChange">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t("tools.actions_set.wipe_inventory") }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ $t("tools.actions_set.wipe_inventory_sub") }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="flex items-start space-x-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
        <Checkbox id="wipe-inventory-confirmation-checkbox" v-model="confirmed" class="mt-0.5" />
        <label for="wipe-inventory-confirmation-checkbox" class="cursor-pointer text-sm font-medium leading-5">
          {{ $t("tools.actions_set.wipe_inventory_confirm") }}
        </label>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel @click="close">
          {{ $t("global.cancel") }}
        </AlertDialogCancel>
        <Button variant="destructive" :disabled="!confirmed" @click="confirm">
          {{ $t("global.confirm") }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
  import { DialogID } from "~/components/ui/dialog-provider/utils";
  import { useDialog } from "~/components/ui/dialog-provider";
  import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  import { Button } from "@/components/ui/button";
  import { Checkbox } from "@/components/ui/checkbox";

  const { registerOpenDialogCallback, closeDialog, addAlert, removeAlert } = useDialog();

  const dialog = ref(false);
  const confirmed = ref(false);
  const isConfirming = ref(false);

  registerOpenDialogCallback(DialogID.WipeInventory, () => {
    dialog.value = true;
    confirmed.value = false;
    isConfirming.value = false;
  });

  watch(
    dialog,
    val => {
      if (val) {
        addAlert("wipe-inventory-dialog");
      } else {
        removeAlert("wipe-inventory-dialog");
      }
    },
    { immediate: true }
  );

  function handleOpenChange(open: boolean) {
    if (!open && !isConfirming.value) {
      close();
    }
  }

  function close() {
    dialog.value = false;
    closeDialog(DialogID.WipeInventory, undefined);
  }

  function confirm() {
    if (!confirmed.value) {
      return;
    }
    isConfirming.value = true;
    closeDialog(DialogID.WipeInventory, true);
    dialog.value = false;
    isConfirming.value = false;
  }
</script>
