<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiAccount from "~icons/mdi/account";
  import MdiAccountGroup from "~icons/mdi/account-group";
  import MdiAccountMultiple from "~icons/mdi/account-multiple";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

  const { t } = useI18n();
  const auth = useAuthContext();

  definePageMeta({ middleware: ["auth"] });
  useHead({ title: computed(() => `HomeBox | ${t("menu.settings")}`) });

  const sections = computed(() => [
    {
      to: "/profile",
      label: t("menu.profile"),
      description: t("settings.sections.profile"),
      icon: MdiAccount,
    },
    {
      to: "/collection/members",
      label: t("menu.collection"),
      description: t("settings.sections.collection"),
      icon: MdiAccountGroup,
    },
    ...(auth.user?.isSuperuser
      ? [
          {
            to: "/settings/users",
            label: t("menu.users"),
            description: t("settings.sections.users"),
            icon: MdiAccountMultiple,
          },
        ]
      : []),
  ]);
</script>

<template>
  <BaseContainer>
    <BaseSectionHeader>{{ $t("settings.title") }}</BaseSectionHeader>
    <p class="mb-5 text-sm text-muted-foreground">{{ $t("settings.description") }}</p>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="section in sections" :key="section.to" :to="section.to" class="group">
        <Card class="h-full transition-colors group-hover:border-primary group-hover:bg-accent/40">
          <CardHeader>
            <component :is="section.icon" class="mb-2 size-7 text-primary" />
            <CardTitle>{{ section.label }}</CardTitle>
            <CardDescription>{{ section.description }}</CardDescription>
          </CardHeader>
        </Card>
      </NuxtLink>
    </div>
  </BaseContainer>
</template>
