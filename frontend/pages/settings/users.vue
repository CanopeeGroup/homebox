<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import MdiAccountMultiple from "~icons/mdi/account-multiple";
  import MdiDelete from "~icons/mdi/delete";
  import MdiContentSave from "~icons/mdi/content-save";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { toast } from "@/components/ui/sonner";
  import type { UserOut } from "~/lib/api/types/data-contracts";

  definePageMeta({ middleware: ["auth"] });
  const { t } = useI18n();
  const auth = useAuthContext();
  const api = useUserApi();
  useHead({ title: computed(() => `HomeBox | ${t("users.title")}`) });

  const form = reactive({ name: "", email: "", password: "", isSuperuser: false });
  const rows = ref<(UserOut & { password: string })[]>([]);
  const loading = ref(false);

  const load = async () => {
    const result = await api.user.listAdminUsers();
    if (result.error) return toast.error(t("users.load_failed"));
    rows.value = result.data.map(user => ({ ...user, password: "" }));
  };

  onMounted(async () => {
    if (!auth.user?.isSuperuser) return navigateTo("/settings");
    await load();
  });

  const createUser = async () => {
    loading.value = true;
    const result = await api.user.createAdminUser({ ...form });
    loading.value = false;
    if (result.error) return toast.error(t("users.save_failed"));
    Object.assign(form, { name: "", email: "", password: "", isSuperuser: false });
    toast.success(t("users.created"));
    await load();
  };

  const saveUser = async (user: UserOut & { password: string }) => {
    const result = await api.user.updateAdminUser(user.id, {
      name: user.name,
      email: user.email,
      password: user.password,
      isSuperuser: user.isSuperuser,
    });
    if (result.error) return toast.error(t("users.save_failed"));
    toast.success(t("users.saved"));
    await load();
  };

  const deleteUser = async (user: UserOut) => {
    if (!confirm(t("users.confirm_delete", { name: user.name }))) return;
    const result = await api.user.deleteAdminUser(user.id);
    if (result.error) return toast.error(t("users.delete_failed"));
    toast.success(t("users.deleted"));
    await load();
  };
</script>

<template>
  <BaseContainer>
    <BaseSectionHeader
      ><span class="flex items-center gap-2"><MdiAccountMultiple />{{ $t("users.title") }}</span></BaseSectionHeader
    >
    <p class="mb-5 text-sm text-muted-foreground">{{ $t("users.description") }}</p>

    <form class="mb-6 grid gap-3 rounded-md border bg-card p-4 md:grid-cols-5" @submit.prevent="createUser">
      <div>
        <Label>{{ $t("users.name") }}</Label
        ><Input v-model="form.name" required />
      </div>
      <div>
        <Label>{{ $t("users.email") }}</Label
        ><Input v-model="form.email" type="email" required />
      </div>
      <div>
        <Label>{{ $t("users.password") }}</Label
        ><Input v-model="form.password" type="password" minlength="6" required />
      </div>
      <label class="flex items-center gap-2 self-end pb-2"
        ><input v-model="form.isSuperuser" type="checkbox" />{{ $t("users.administrator") }}</label
      >
      <Button class="self-end" type="submit" :disabled="loading">{{ $t("users.add") }}</Button>
    </form>

    <div class="space-y-2">
      <div
        v-for="user in rows"
        :key="user.id"
        class="grid gap-2 rounded-md border bg-card p-3 md:grid-cols-[1fr_1.3fr_1fr_auto_auto_auto] md:items-center"
      >
        <Input v-model="user.name" :aria-label="$t('users.name')" />
        <Input v-model="user.email" type="email" :aria-label="$t('users.email')" />
        <Input v-model="user.password" type="password" :placeholder="$t('users.password_unchanged')" />
        <label class="flex items-center gap-2"
          ><input v-model="user.isSuperuser" type="checkbox" />{{ $t("users.administrator") }}</label
        >
        <Button size="icon" variant="outline" :title="$t('users.save')" @click="saveUser(user)"
          ><MdiContentSave
        /></Button>
        <Button
          size="icon"
          variant="destructive"
          :disabled="user.id === auth.user?.id"
          :title="$t('users.delete')"
          @click="deleteUser(user)"
          ><MdiDelete
        /></Button>
      </div>
    </div>
  </BaseContainer>
</template>
