<template>
  <div id="app">
    <!--
    Confirmation Modal is a singleton used by all components so we render
    it here to ensure it's always available. Possibly could move this further
    up the tree
    -->
    <ModalConfirm />
    <OutdatedModal v-if="status" :status="status" />
    <EntityCreateModal />
    <WipeInventoryDialog />
    <ItemBarcodeModal />
    <AppQuickMenuModal :actions="quickMenuActions" />
    <AppScannerModal />
    <CollectionCreateModal />
    <CollectionJoinModal />
    <CollectionInviteCreateModal />
    <SidebarProvider :default-open="sidebarState">
      <Sidebar collapsible="icon">
        <SidebarHeader class="items-center">
          <SidebarGroupLabel class="text-base group-data-[collapsible=icon]:hidden">{{
            $t("global.welcome", { username: username })
          }}</SidebarGroupLabel>
          <NuxtLink class="group-data-[collapsible=icon]:hidden" to="/locations">
            <div class="flex size-24 items-center justify-center rounded-full bg-background-accent p-4">
              <AppLogo />
            </div>
          </NuxtLink>

          <CollectionSelector />

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton
                class="flex justify-center bg-primary text-primary-foreground drop-shadow-md hover:bg-primary/90 active:bg-primary/90 active:text-primary-foreground group-data-[collapsible=icon]:justify-start"
                :tooltip="$t('global.create')"
                hotkey="Shortcut: Ctrl+`"
              >
                <MdiPlus />
                <span>
                  {{ $t("global.create") }}
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="z-40 min-w-[var(--reka-dropdown-menu-trigger-width)]">
              <DropdownMenuItem
                v-for="btn in dropdown"
                :key="btn.id"
                class="group cursor-pointer text-lg"
                @click="
                  () => {
                    if (btn.dialogId === DialogID.CreateEntity) {
                      if (btn.id == 0)
                        // create item
                        openDialog(btn.dialogId, { params: { baseType: 'item' } });
                      else if (btn.id == 1)
                        // create location
                        openDialog(btn.dialogId, { params: { baseType: 'location' } });
                    } else {
                      openDialog(btn.dialogId as NoParamDialogIDs);
                    }
                  }
                "
              >
                {{ btn.name.value }}
                <Shortcut
                  v-if="btn.shortcut"
                  class="invisible ml-auto group-hover:visible"
                  :keys="btn.shortcut.replace('Shift', '⇧').split('+')"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <template v-for="n in nav" :key="n.id">
                <SidebarMenuItem v-if="!n.collapsible" :key="n.id">
                  <SidebarMenuLink
                    :href="n.to"
                    :class="{
                      'bg-accent text-accent-foreground': n.active?.value,
                      'text-nowrap': typeof locale === 'string' && locale.startsWith('zh-'),
                    }"
                    :tooltip="n.name.value"
                  >
                    <component :is="n.icon" />
                    <span>{{ n.name.value }}</span>
                  </SidebarMenuLink>
                </SidebarMenuItem>

                <Collapsible v-else default-open class="group/collapsible">
                  <SidebarMenuItem>
                    <SidebarMenuItem class="flex gap-1">
                      <SidebarMenuLink
                        :href="n.to"
                        :class="{
                          'bg-accent text-accent-foreground': n.active?.value,
                          'text-nowrap': typeof locale === 'string' && locale.startsWith('zh-'),
                        }"
                        :tooltip="n.name.value"
                      >
                        <component :is="n.icon" />
                        <span>{{ n.name.value }}</span>
                      </SidebarMenuLink>
                      <CollapsibleTrigger as-child>
                        <SidebarMenuButton class="flex size-12 items-center justify-center">
                          <MdiChevronRight
                            class="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem v-for="c in n.collapsible" :key="c.id">
                          <SidebarMenuLink
                            :href="c.to"
                            :class="{
                              'bg-accent text-accent-foreground': c.active?.value,
                              'text-nowrap': typeof locale === 'string' && locale.startsWith('zh-'),
                              'h-min py-0': true,
                            }"
                            :tooltip="c.name.value"
                          >
                            <span>{{ c.name.value }}</span>
                          </SidebarMenuLink>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </template>

              <!-- makes scanner accessible easily if using legacy header -->
              <SidebarMenuItem v-if="preferences.displayLegacyHeader">
                <SidebarMenuButton
                  :class="{
                    'text-nowrap': typeof locale === 'string' && locale.startsWith('zh-'),
                  }"
                  :tooltip="$t('menu.scanner')"
                  @click.prevent="openDialog(DialogID.Scanner)"
                >
                  <MdiQrcodeScan />
                  <span>{{ $t("menu.scanner") }}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenuButton
            class="flex justify-center group-data-[collapsible=icon]:justify-start group-data-[collapsible=icon]:bg-destructive group-data-[collapsible=icon]:text-destructive-foreground group-data-[collapsible=icon]:shadow-sm group-data-[collapsible=icon]:hover:bg-destructive/90"
            :tooltip="$t('global.sign_out')"
            data-testid="logout-button"
            @click="logout"
          >
            <MdiLogout />
            <span>
              {{ $t("global.sign_out") }}
            </span>
          </SidebarMenuButton>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
      <SidebarInset class="min-h-dvh max-w-full overflow-hidden bg-background-accent">
        <div class="relative flex h-full flex-col justify-center">
          <div v-if="preferences.displayLegacyHeader">
            <AppHeaderDecor class="-mt-10 hidden lg:block" />
            <SidebarTrigger class="absolute left-2 top-2 hidden lg:flex" variant="default" />
          </div>
          <!-- IMPORTANT: if you change the height of this div, alter the top value in the item edit page-->
          <div
            class="sticky top-0 z-20 flex h-[var(--header-height-mobile)] translate-y-[-0.5px] flex-col bg-secondary p-2 shadow-md sm:h-[var(--header-height)] sm:flex-row"
            :class="{
              'lg:hidden': preferences.displayLegacyHeader,
            }"
          >
            <div class="flex h-1/2 items-center gap-2 sm:h-auto">
              <SidebarTrigger variant="default" />
              <NuxtLink to="/locations">
                <AppHeaderText class="h-6" />
              </NuxtLink>
            </div>
            <div class="sm:grow" />
            <div class="flex h-1/2 grow items-center justify-end gap-2 sm:h-auto">
              <Input
                v-model:model-value="search"
                class="h-9 grow sm:max-w-sm"
                :placeholder="$t('global.search')"
                type="search"
                @keyup.enter="triggerSearch"
              />
              <div>
                <Button size="icon" @click="triggerSearch">
                  <MdiMagnify />
                </Button>
              </div>
              <div></div>
            </div>
          </div>

          <slot />
          <div class="grow" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  </div>
</template>

<script lang="ts" setup>
  import { useI18n } from "vue-i18n";
  import { useLocationStore } from "~~/stores/locations";

  import MdiFileTree from "~icons/mdi/file-tree";
  import MdiMagnify from "~icons/mdi/magnify";
  import MdiQrcodeScan from "~icons/mdi/qrcode-scan";
  import MdiCog from "~icons/mdi/cog";
  import MdiPlus from "~icons/mdi/plus";
  import MdiLogout from "~icons/mdi/logout";
  import MdiFileDocumentMultiple from "~icons/mdi/file-document-multiple";
  import MdiHistory from "~icons/mdi/history";
  import MdiChevronRight from "~icons/mdi/chevron-right";

  import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuLink,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
  } from "@/components/ui/sidebar";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
  import { Shortcut } from "~/components/ui/shortcut";
  import { useDialog } from "~/components/ui/dialog-provider";
  import { Input } from "~/components/ui/input";
  import { Button } from "~/components/ui/button";
  import { DialogID, type NoParamDialogIDs } from "~/components/ui/dialog-provider/utils";
  import ModalConfirm from "~/components/ModalConfirm.vue";
  import OutdatedModal from "~/components/App/OutdatedModal.vue";
  import AppLogo from "~/components/App/Logo.vue";
  import AppHeaderDecor from "~/components/App/HeaderDecor.vue";
  import AppHeaderText from "~/components/App/HeaderText.vue";
  import CollectionSelector from "~/components/Collection/Selector.vue";

  // Large modal components are split into separate chunks. They remain mounted
  // as dialog-provider listeners, but their code is fetched outside the initial bundle.
  const EntityCreateModal = defineAsyncComponent(() => import("~/components/Entity/CreateModal.vue"));
  const WipeInventoryDialog = defineAsyncComponent(() => import("~/components/WipeInventoryDialog.vue"));
  const ItemBarcodeModal = defineAsyncComponent(() => import("~/components/Item/BarcodeModal.vue"));
  const AppQuickMenuModal = defineAsyncComponent(() => import("~/components/App/QuickMenuModal.vue"));
  const AppScannerModal = defineAsyncComponent(() => import("~/components/App/ScannerModal.vue"));
  const CollectionCreateModal = defineAsyncComponent(() => import("~/components/Collection/CreateModal.vue"));
  const CollectionJoinModal = defineAsyncComponent(() => import("~/components/Collection/JoinModal.vue"));
  const CollectionInviteCreateModal = defineAsyncComponent(() => import("~/components/Collection/InviteCreateModal.vue"));

  const { t, locale } = useI18n();
  const authCtx = useAuthContext();
  const username = computed(() => authCtx.user?.name || "User");

  const { openDialog } = useDialog();

  const preferences = useViewPreferences();

  // get sidebar state from cookies
  const sidebarState = useCookie("sidebar:state", {
    readonly: true,
    decode: value => value !== "false",
  });

  const pubApi = usePublicApi();
  const { data: status } = useAsyncData(async () => {
    const { data } = await pubApi.status();

    return data;
  });

  const search = ref("");

  const triggerSearch = () => {
    if (search.value) {
      navigateTo(`/items?q=${encodeURIComponent(search.value)}`);
      search.value = "";
      // remove focus from input
      if (document.activeElement && "blur" in document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  };

  // Preload currency format
  useFormatCurrency();

  type DropdownItem = {
    id: number;
    name: ComputedRef<string>;
    shortcut: string;
    dialogId: DialogID;
  };

  const dropdown: DropdownItem[] = [
    {
      id: 0,
      name: computed(() => t("menu.create_item")),
      shortcut: "Shift+1",
      dialogId: DialogID.CreateEntity,
    },
    {
      id: 1,
      name: computed(() => t("menu.create_location")),
      shortcut: "Shift+2",
      dialogId: DialogID.CreateEntity,
    },
  ];

  const route = useRoute();
  const router = useRouter();

  const nav: {
    icon: Component;
    active: ComputedRef<boolean>;
    id: number;
    name: ComputedRef<string>;
    to: string;
    collapsible?: {
      active: ComputedRef<boolean>;
      id: number;
      name: ComputedRef<string>;
      to: string;
    }[];
  }[] = [
    {
      icon: MdiFileTree,
      id: 1,
      active: computed(() => route.path === "/locations"),
      name: computed(() => t("menu.locations")),
      to: "/locations",
    },
    {
      icon: MdiMagnify,
      id: 3,
      active: computed(() => route.path === "/items"),
      name: computed(() => t("menu.search")),
      to: "/items",
    },
    {
      icon: MdiFileDocumentMultiple,
      id: 4,
      active: computed(() => route.path === "/templates"),
      name: computed(() => t("menu.templates")),
      to: "/templates",
    },
    {
      icon: MdiHistory,
      id: 8,
      active: computed(() => route.path === "/journal"),
      name: computed(() => t("menu.journal")),
      to: "/journal",
    },
    {
      icon: MdiCog,
      id: 7,
      active: computed(
        () =>
          route.path === "/settings" ||
          route.path === "/maintenance" ||
          route.path === "/profile" ||
          route.path === "/settings/users" ||
          route.path.includes("/collection")
      ),
      name: computed(() => t("menu.settings")),
      to: "/settings",
      collapsible: [
        {
          id: 71,
          active: computed(() => route.path === "/maintenance"),
          name: computed(() => t("menu.maintenance")),
          to: "/maintenance",
        },
        {
          id: 72,
          active: computed(() => route.path === "/profile"),
          name: computed(() => t("menu.profile")),
          to: "/profile",
        },
        {
          id: 73,
          active: computed(() => route.path.includes("/collection")),
          name: computed(() => t("menu.collection")),
          to: "/collection/members",
        },
        ...(authCtx.user?.isSuperuser
          ? [
              {
                id: 74,
                active: computed(() => route.path === "/settings/users"),
                name: computed(() => t("menu.users")),
                to: "/settings/users",
              },
            ]
          : []),
      ],
    },
  ];

  const quickMenuActions = reactive([
    ...dropdown.map(v => ({
      text: computed(() => v.name.value),
      dialogId: v.dialogId,
      shortcut: v.shortcut.split("+")[1] as string,
      id: v.id,
      type: "create" as const,
    })),
    ...nav.map(v => ({
      text: computed(() => v.name.value),
      href: v.to,
      type: "navigate" as const,
    })),
  ]);

  const locationStore = useLocationStore();
  onMounted(() => {
    // Do not preload/refresh locations from the global layout. Opening or
    // expanding the sidebar must stay network-free for location data. The
    // locations page and selectors load their own datasets when required.

    // Auto-open JoinModal when invitation token is in URL
    const token = route.query.token;
    if (typeof token === "string" && token.length > 0) {
      // Remove token from browser URL
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState(history.state, "", url.toString());

      // Sync router's state to clear route.query.token
      const { token: _, ...cleanQuery } = route.query;
      router.replace({ query: cleanQuery });

      openDialog(DialogID.JoinCollection, {
        params: { inviteCode: token },
      });
    }
  });

  const nuxtApp = useNuxtApp();
  const refreshDisplay = useDebounceFn(() => {
    // Keep global mutation handling lightweight. Location data is refreshed
    // only while the locations page is visible; simply opening the sidebar
    // never triggers a locations request.
    if (route.path === "/locations") {
      void locationStore.refreshTree();
    }
    void nuxtApp.runWithContext(() => refreshNuxtData());
  }, 250);
  onServerEvent(ServerEvent.EntityMutation, refreshDisplay);
  onServerEvent(ServerEvent.ImportMutation, refreshDisplay);
  onServerEvent(ServerEvent.UserMutation, refreshDisplay);
  onServerEvent(ServerEvent.ExportMutation, refreshDisplay);

  const api = useUserApi();

  async function logout() {
    await authCtx.logout(api);
    navigateTo("/");
  }
</script>
