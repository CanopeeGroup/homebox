<template>
  <!-- Dedicated picker dialog used by the item creation form. -->
  <template v-if="dialog">
    <div :class="compact ? '' : 'flex flex-col gap-1'">
      <Label v-if="!compact" :for="id" class="px-1">{{ $t("components.template.selector.label") }}</Label>
      <Button
        :id="id"
        type="button"
        variant="outline"
        :size="compact ? 'icon' : 'default'"
        role="combobox"
        :aria-expanded="open"
        :class="[value ? 'border-primary text-primary' : '', !compact && 'w-full justify-between']"
        @click="open = true"
      >
        <MdiFileDocumentOutline v-if="compact" class="size-5" />
        <template v-else>
          <span class="min-w-0 flex-auto truncate text-left">
            {{ value?.name || $t("components.template.selector.select") }}
          </span>
          <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
        </template>
      </Button>
    </div>

    <DialogRoot v-model:open="open">
      <DialogContent
        class="z-[100] flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-3 rounded-none p-3 sm:h-[80dvh] sm:max-h-[80dvh] sm:w-[min(90vw,48rem)] sm:max-w-3xl sm:rounded-lg sm:p-5"
      >
        <DialogHeader class="shrink-0">
          <DialogTitle>{{ $t("components.template.selector.label") }}</DialogTitle>
        </DialogHeader>
        <Command class="min-h-0 flex-1 border" :ignore-filter="true">
          <CommandInput
            v-model="search"
            class="shrink-0"
            :placeholder="$t('components.template.selector.search')"
            :display-value="_ => ''"
          />
          <CommandEmpty>{{ $t("components.template.selector.not_found") }}</CommandEmpty>
          <CommandList class="!max-h-none min-h-0 flex-1 overscroll-contain">
            <CommandGroup>
              <CommandItem
                v-for="template in filteredTemplates"
                :key="template.id"
                :value="template.id"
                @select="selectTemplate(template)"
              >
                <Check :class="cn('mr-2 h-4 w-4', value?.id === template.id ? 'opacity-100' : 'opacity-0')" />
                <div class="flex w-full min-w-0 flex-col">
                  <div class="truncate">{{ template.name }}</div>
                  <div v-if="template.description" class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {{ template.description }}
                  </div>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator v-if="value" />
            <CommandGroup v-if="value">
              <CommandItem value="clear-selection" @select="clearSelection">
                <X class="mr-2 size-4" />
                <span class="text-destructive">{{ $t("components.template.selector.clear") }}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </DialogRoot>
  </template>

  <!-- Touch devices: a viewport-fixed picker is not displaced by the virtual keyboard. -->
  <template v-else-if="useTouchLayout">
    <div :class="compact ? '' : 'flex flex-col gap-1'">
      <Label v-if="!compact" :for="id" class="px-1">{{ $t("components.template.selector.label") }}</Label>
      <Button
        :id="id"
        type="button"
        variant="outline"
        :size="compact ? 'icon' : 'default'"
        role="combobox"
        :aria-expanded="open"
        :aria-label="$t('components.template.apply_template')"
        :class="[value ? 'border-primary text-primary' : '', !compact && 'w-full justify-between']"
        @click="open = true"
      >
        <MdiFileDocumentOutline v-if="compact" class="size-5" />
        <template v-else>
          <span class="min-w-0 flex-auto truncate text-left">
            {{ value?.name || $t("components.template.selector.select") }}
          </span>
          <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
        </template>
      </Button>
    </div>

    <div v-if="open" class="fixed inset-0 z-[100] flex h-dvh flex-col bg-background p-3">
      <div class="mb-2 flex shrink-0 items-center justify-between gap-2">
        <strong class="text-base">{{ $t("components.template.selector.label") }}</strong>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          :aria-label="$t('components.template.selector.close')"
          @click="open = false"
        >
          <X class="size-5" />
        </Button>
      </div>
      <Command class="min-h-0 flex-1 border" :ignore-filter="true">
        <CommandInput
          v-model="search"
          class="shrink-0"
          :placeholder="$t('components.template.selector.search')"
          :display-value="_ => ''"
        />
        <CommandEmpty>{{ $t("components.template.selector.not_found") }}</CommandEmpty>
        <CommandList class="!max-h-none min-h-0 flex-1 overscroll-contain">
          <CommandGroup>
            <CommandItem
              v-for="template in filteredTemplates"
              :key="template.id"
              :value="template.id"
              @select="selectTemplate(template)"
            >
              <Check :class="cn('mr-2 h-4 w-4', value?.id === template.id ? 'opacity-100' : 'opacity-0')" />
              <div class="flex w-full min-w-0 flex-col">
                <div class="truncate">{{ template.name }}</div>
                <div v-if="template.description" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {{ template.description }}
                </div>
              </div>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator v-if="value" />
          <CommandGroup v-if="value">
            <CommandItem value="clear-selection" @select="clearSelection">
              <X class="mr-2 size-4" />
              <span class="text-destructive">{{ $t("components.template.selector.clear") }}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  </template>

  <!-- Compact mode: icon button only -->
  <Popover v-else-if="compact" v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        :id="id"
        type="button"
        variant="outline"
        size="icon"
        role="combobox"
        :aria-expanded="open"
        :aria-label="$t('components.template.apply_template')"
        :title="$t('components.template.apply_template')"
        :class="value ? 'border-primary text-primary' : ''"
      >
        <MdiFileDocumentOutline class="size-5" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="z-[70] w-[calc(100vw-1rem)] max-w-80 p-0 sm:w-80" align="end" :collision-padding="8">
      <Command :ignore-filter="true">
        <CommandInput
          v-model="search"
          :placeholder="$t('components.template.selector.search')"
          :display-value="_ => ''"
        />
        <CommandEmpty>{{ $t("components.template.selector.not_found") }}</CommandEmpty>
        <CommandList class="max-h-[45dvh] sm:max-h-[300px]">
          <CommandGroup>
            <CommandItem
              v-for="template in filteredTemplates"
              :key="template.id"
              :value="template.id"
              @select="selectTemplate(template)"
            >
              <Check :class="cn('mr-2 h-4 w-4', value?.id === template.id ? 'opacity-100' : 'opacity-0')" />
              <div class="flex w-full flex-col">
                <div>{{ template.name }}</div>
                <div v-if="template.description" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {{ template.description }}
                </div>
              </div>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator v-if="value" />
          <CommandGroup v-if="value">
            <CommandItem v-if="value" value="clear-selection" @select="clearSelection">
              <div class="flex w-full">
                {{ $t("components.template.selector.clear") }}
              </div>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>

  <!-- Full mode: label + full-width button -->
  <div v-else class="flex flex-col gap-1">
    <Label :for="id" class="px-1">{{ $t("components.template.selector.label") }}</Label>

    <Popover v-model:open="open">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          role="combobox"
          :aria-expanded="open"
          class="w-full justify-between"
        >
          {{ value && value.name ? value.name : $t("components.template.selector.select") }}
          <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        class="z-[70] w-[calc(100vw-1rem)] max-w-md p-0 sm:w-[--reka-popper-anchor-width]"
        align="start"
        :collision-padding="8"
      >
        <Command :ignore-filter="true">
          <CommandInput
            v-model="search"
            :placeholder="$t('components.template.selector.search')"
            :display-value="_ => ''"
          />
          <CommandEmpty>{{ $t("components.template.selector.not_found") }}</CommandEmpty>
          <CommandList class="max-h-[45dvh] sm:max-h-[300px]">
            <CommandGroup>
              <CommandItem
                v-for="template in filteredTemplates"
                :key="template.id"
                :value="template.id"
                @select="selectTemplate(template)"
              >
                <Check :class="cn('mr-2 h-4 w-4', value?.id === template.id ? 'opacity-100' : 'opacity-0')" />
                <div class="flex w-full flex-col">
                  <div>{{ template.name }}</div>
                  <div v-if="template.description" class="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {{ template.description }}
                  </div>
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandItem v-if="value" value="clear-selection" @select="clearSelection">
              <X :class="cn('mr-2 h-4 w-4')" />
              <div class="flex w-full">
                <span class="text-destructive">{{ $t("components.template.selector.clear") }}</span>
              </div>
            </CommandItem>
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
  import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
  } from "~/components/ui/command";
  import { Label } from "~/components/ui/label";
  import { DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
  import { DialogRoot } from "reka-ui";
  import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
  import { cn } from "~/lib/utils";
  import type { EntityTemplateSummary } from "~~/lib/api/types/data-contracts";
  import MdiFileDocumentOutline from "~icons/mdi/file-document-outline";

  type Props = {
    modelValue?: EntityTemplateSummary | null;
    compact?: boolean;
    dialog?: boolean;
  };

  const props = defineProps<Props>();
  const emit = defineEmits(["update:modelValue", "template-selected"]);

  const { compact, dialog } = toRefs(props);
  const open = ref(false);
  const useTouchLayout = useMediaQuery("(max-width: 1024px), (pointer: coarse)");
  const search = ref("");
  const id = useId();
  const value = useVModel(props, "modelValue", emit);

  const api = useUserApi();

  // The stable AsyncData key shares one in-memory result between selector
  // instances. A shallow ref avoids proxying every field in large template sets.
  const { data: templates } = useAsyncData(
    "templates-selector",
    async () => {
      const { data, error } = await api.templates.getAll();
      if (error) {
        return [];
      }
      return data;
    },
    {
      deep: false,
      dedupe: "defer",
    }
  );

  function selectTemplate(template: EntityTemplateSummary) {
    if (value.value?.id !== template.id) {
      value.value = template;
      emit("template-selected", template);
    } else {
      value.value = null;
      emit("template-selected", null);
    }
    open.value = false;
  }

  function clearSelection() {
    value.value = null;
    emit("template-selected", null);
    search.value = "";
    open.value = false;
  }

  const TEMPLATE_RENDER_LIMIT = 100;
  const filteredTemplates = computed(() => {
    if (!templates.value) return [];
    // Search the complete cached collection, but only mount the best matches.
    // Rendering thousands of CommandItem components is the main opening delay
    // on mobile browsers.
    return fuzzysort
      .go(search.value, templates.value, { key: "name", all: true })
      .slice(0, TEMPLATE_RENDER_LIMIT)
      .map(i => i.obj);
  });

  watch(
    () => value.value,
    () => {
      if (!value.value) {
        search.value = "";
      }
    }
  );
</script>
