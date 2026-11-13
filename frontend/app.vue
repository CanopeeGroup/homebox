<template>
  <DialogProvider>
    <ClientOnly>
      <Toaster class="pointer-events-auto" />
    </ClientOnly>

    <NuxtLayout>
      <Html :lang="locale" :data-theme="theme || 'homebox'" />
      <Link rel="icon" :href="avatar || '/favicon.svg'" />
      <Link rel="apple-touch-icon" href="/pwa-192x192.png" />
      <Meta name="theme-color" content="#5b7f67" />
      <Link rel="manifest" href="/manifest.webmanifest" />
      <NuxtPage />
    </NuxtLayout>
  </DialogProvider>
</template>

<script lang="ts" setup>
  import { useI18n } from "vue-i18n";
  import { DialogProvider } from "@/components/ui/dialog-provider";
  import { Toaster } from "@/components/ui/sonner";

  const { theme } = useTheme();

  const { locale } = useI18n();

  const { avatar, title, load } = useAdminBranding();
  useHead(() => {
    const appTitle = title.value;
    return { titleTemplate: (pageTitle?: string) => (pageTitle ? `${appTitle} | ${pageTitle}` : appTitle) };
  });
  onMounted(() => void load());

  useViewPreferencesSync();
</script>
