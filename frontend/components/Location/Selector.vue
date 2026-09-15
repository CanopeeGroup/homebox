<template>
  <div class="flex flex-col gap-1">
    <Label :for="id" class="px-1">
      {{ $t("components.location.selector.parent_location") }}
    </Label>

    <template v-if="dialog">
      <Button
        :id="id"
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-full justify-between"
        @click="open = true"
      >
        <span class="min-w-0 flex-auto truncate text-left">
          {{ value && value.name ? value.name : $t("components.location.selector.select_location") }}
        </span>
        <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      <DialogRoot v-model:open="open">
        <DialogContent
          class="z-[100] flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-3 rounded-none p-3 sm:h-[80dvh] sm:max-h-[80dvh] sm:w-[min(90vw,48rem)] sm:max-w-3xl sm:rounded-lg sm:p-5"
        >
          <DialogHeader class="shrink-0">
            <DialogTitle>{{ $t("components.location.selector.parent_location") }}</DialogTitle>
          </DialogHeader>
          <Command class="min-h-0 flex-1 border" :ignore-filter="true">
            <CommandInput
              v-model="search"
              class="shrink-0"
              :placeholder="$t('components.location.selector.search_location')"
              :display-value="_ => ''"
            />
            <CommandEmpty>{{ $t("components.location.selector.no_location_found") }}</CommandEmpty>
            <CommandList class="!max-h-none min-h-0 flex-1 overscroll-contain">
              <CommandGroup>
                <CommandItem
                  v-for="location in filteredLocations"
                  :key="location.id"
                  :value="location.id"
                  @select="selectLocation(location as unknown as EntitySummary)"
                >
                  <Check :class="cn('mr-2 h-4 w-4', value?.id === location.id ? 'opacity-100' : 'opacity-0')" />
                  <div class="min-w-0">
                    <div class="truncate">{{ location.name }}</div>
                    <div v-if="location.name !== location.treeString" class="mt-1 truncate text-xs text-muted-foreground">
                      {{ location.treeString }}
                    </div>
                  </div>
                </CommandItem>
              </CommandGroup>
              <CommandGroup v-if="value">
                <CommandItem value="clear-location-selection" @select="clearSelection">
                  <X class="mr-2 size-4" />
                  <span class="text-destructive">{{ $t("components.location.selector.clear") }}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </DialogRoot>
    </template>

    <template v-else-if="useTouchLayout">
      <Button
        :id="id"
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        class="w-full justify-between"
        @click="open = true"
      >
        <span class="min-w-0 flex-auto truncate text-left">
          {{ value && value.name ? value.name : $t("components.location.selector.select_location") }}
        </span>
        <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      <div v-if="open" class="fixed inset-0 z-[100] flex h-dvh flex-col bg-background p-3">
        <div class="mb-2 flex shrink-0 items-center justify-between gap-2">
          <strong class="text-base">{{ $t("components.location.selector.parent_location") }}</strong>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            :aria-label="$t('components.location.selector.close')"
            @click="open = false"
          >
            <X class="size-5" />
          </Button>
        </div>
        <Command class="min-h-0 flex-1 border" :ignore-filter="true">
          <CommandInput
            v-model="search"
            class="shrink-0"
            :placeholder="$t('components.location.selector.search_location')"
            :display-value="_ => ''"
          />
          <CommandEmpty>{{ $t("components.location.selector.no_location_found") }}</CommandEmpty>
          <CommandList class="!max-h-none min-h-0 flex-1 overscroll-contain">
            <CommandGroup>
              <CommandItem
                v-for="location in filteredLocations"
                :key="location.id"
                :value="location.id"
                @select="selectLocation(location as unknown as EntitySummary)"
              >
                <Check :class="cn('mr-2 h-4 w-4', value?.id === location.id ? 'opacity-100' : 'opacity-0')" />
                <div class="min-w-0">
                  <div class="truncate">{{ location.name }}</div>
                  <div v-if="location.name !== location.treeString" class="mt-1 truncate text-xs text-muted-foreground">
                    {{ location.treeString }}
                  </div>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandGroup v-if="value">
              <CommandItem value="clear-location-selection" @select="clearSelection">
                <X class="mr-2 size-4" />
                <span class="text-destructive">{{ $t("components.location.selector.clear") }}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </template>

    <Popover v-else v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between"
        >
          <span class="min-w-0 flex-auto truncate text-left">
            {{ value && value.name ? value.name : $t("components.location.selector.select_location") }}
          </span>

          <span class="ml-2 flex items-center">
            <button
              v-if="value"
              type="button"
              class="shrink-0 rounded p-1 hover:bg-primary/20"
              :aria-label="$t('components.location.selector.clear')"
              @click.stop.prevent="clearSelection"
            >
              <X class="size-4" />
            </button>

            <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[--reka-popper-anchor-width] p-0">
        <Command :ignore-filter="true">
          <CommandInput
            v-model="search"
            :placeholder="$t('components.location.selector.search_location')"
            :display-value="_ => ''"
          />
          <CommandEmpty>{{ $t("components.location.selector.no_location_found") }}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              <CommandItem
                v-for="location in filteredLocations"
                :key="location.id"
                :value="location.id"
                @select="selectLocation(location as unknown as EntitySummary)"
              >
                <Check :class="cn('mr-2 h-4 w-4', value?.id === location.id ? 'opacity-100' : 'opacity-0')" />
                <div>
                  <div class="flex w-full">
                    {{ location.name }}
                  </div>
                  <div v-if="location.name !== location.treeString" class="mt-1 text-xs text-muted-foreground">
                    {{ location.treeString }}
                  </div>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
</template>

<script setup lang="ts">
  import { useMediaQuery } from "@vueuse/core";
  import { Check, ChevronsUpDown, X } from "lucide-vue-next";
  import fuzzysort from "fuzzysort";
  import { Button } from "~/components/ui/button";
  import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
  import { Label } from "~/components/ui/label";
  import { DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
  import { DialogRoot } from "reka-ui";
  import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
  import { cn } from "~/lib/utils";
  import type { EntitySummary } from "~~/lib/api/types/data-contracts";
  import { useFlatLocations } from "~~/composables/use-location-helpers";

  type Props = {
    modelValue?: EntitySummary | null;
    currentLocation?: EntitySummary;
    dialog?: boolean;
  };

  const props = defineProps<Props>();
  const emit = defineEmits(["update:modelValue"]);
  const { dialog } = toRefs(props);

  const open = ref(false);
  const useTouchLayout = useMediaQuery("(max-width: 1024px), (pointer: coarse)");
  const search = ref("");
  const id = useId();
  const locations = useFlatLocations(props.currentLocation);
  const value = useVModel(props, "modelValue", emit);

  function selectLocation(location: EntitySummary) {
    if (value.value?.id !== location.id) {
      value.value = location;
    } else {
      value.value = null;
    }
    open.value = false;
  }

  function clearSelection() {
    value.value = null;
    search.value = "";
    open.value = false;
  }

  const filteredLocations = computed(() => {
    const keys = ["name", "treeString"];
    const filtered = fuzzysort.go(search.value, locations.value, { keys, all: true }).map(i => i.obj);

    return filtered;
  });

  // Reset search when value is cleared
  watch(
    () => value.value,
    () => {
      if (!value.value) {
        search.value = "";
      }
    }
  );
</script>
