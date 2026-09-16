<script setup lang="ts">
  import { useI18n } from "vue-i18n";
  import { toast } from "@/components/ui/sonner";
  import type { Detail } from "~~/components/global/DetailsSection/types";
  import MdiLoading from "~icons/mdi/loading";
  import MdiAccount from "~icons/mdi/account";
  import MdiDelete from "~icons/mdi/delete";
  import { Button } from "@/components/ui/button";
  import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { useDialog } from "@/components/ui/dialog-provider";
  import LanguageSelector from "~/components/App/LanguageSelector.vue";
  import AdminAvatar from "~/components/Profile/AdminAvatar.vue";
  import { DialogID } from "~/components/ui/dialog-provider/utils";
  import ItemDuplicateSettings from "~/components/Item/DuplicateSettings.vue";
  import FormPassword from "~/components/Form/Password.vue";
  import BaseContainer from "@/components/Base/Container.vue";
  import BaseCard from "@/components/Base/Card.vue";
  import BaseSectionHeader from "@/components/Base/SectionHeader.vue";
  import DetailsSection from "@/components/global/DetailsSection/DetailsSection.vue";
  import PasswordScore from "~/components/global/PasswordScore.vue";
  import { PASSWORD_MIN_LENGTH, PASSWORD_RULES } from "~/lib/passwords";

  const { t } = useI18n();

  definePageMeta({ middleware: ["auth"] });
  useHead({ title: "HomeBox | " + t("menu.profile") });

  const api = useUserApi();
  const confirm = useConfirm();
  const { openDialog, closeDialog } = useDialog();
  const preferences = useViewPreferences();
  const auth = useAuthContext();

  const details = computed(() => {
    return [
      { name: "global.name", text: auth.user?.name || t("global.unknown") },
      { name: "global.email", text: auth.user?.email || t("global.unknown") },
    ] as Detail[];
  });

  async function deleteProfile() {
    const result = await confirm.open(t("profile.delete_account_confirm"));
    if (result.isCanceled) return;
    const { response } = await api.user.delete();
    if (response?.status === 204) {
      toast.success(t("profile.toast.account_deleted"));
      auth.logout(api);
      navigateTo("/");
    }
    toast.error(t("profile.toast.failed_delete_account"));
  }

  const passwordChange = reactive({ loading: false, current: "", new: "", isValid: false });

  async function changePassword() {
    passwordChange.loading = true;
    if (!passwordChange.isValid) {
      passwordChange.loading = false;
      return;
    }
    const { error } = await api.user.changePassword(passwordChange.current, passwordChange.new);
    if (error) {
      toast.error(t("profile.toast.failed_change_password"));
      passwordChange.loading = false;
      return;
    }
    toast.success(t("profile.toast.password_changed"));
    closeDialog(DialogID.ChangePassword);
    passwordChange.new = "";
    passwordChange.current = "";
    passwordChange.loading = false;
  }

  async function logoutAllDevices() {
    const result = await confirm.open(t("profile.logout_all_confirm"));
    if (result.isCanceled) return;
    const { error } = await api.user.logoutAll();
    if (error) {
      toast.error(t("profile.toast.failed_logout_all"));
      return;
    }
    toast.success(t("profile.toast.logout_all_success"));
    auth.invalidateSession();
    navigateTo("/");
  }
</script>

<template>
  <div>
    <Dialog :dialog-id="DialogID.DuplicateSettings">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ $t("items.duplicate.title") }}</DialogTitle></DialogHeader>
        <ItemDuplicateSettings v-model="preferences.duplicateSettings" />
        <p class="text-sm text-muted-foreground">{{ $t("items.duplicate.override_instructions") }}</p>
      </DialogContent>
    </Dialog>

    <Dialog :dialog-id="DialogID.ChangePassword">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ $t("profile.change_password") }}</DialogTitle></DialogHeader>
        <form id="change-password-form" name="change-password" method="post" @submit.prevent="changePassword">
          <FormPassword id="current-password" v-model="passwordChange.current" :label="$t('profile.current_password')" name="current-password" autocomplete="current-password" placeholder="" :required="true" class="mb-2" />
          <FormPassword id="new-password" v-model="passwordChange.new" :label="$t('profile.new_password')" name="new-password" autocomplete="new-password" placeholder="" :min-length="PASSWORD_MIN_LENGTH" :passwordrules="PASSWORD_RULES" :required="true" />
          <PasswordScore v-model:valid="passwordChange.isValid" :password="passwordChange.new" />
          <DialogFooter>
            <Button :disabled="!passwordChange.isValid || passwordChange.loading" type="submit">
              <MdiLoading v-if="passwordChange.loading" class="animate-spin" />
              {{ $t("global.submit") }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <BaseContainer class="flex flex-col gap-4">
      <BaseCard>
        <template #title>
          <BaseSectionHeader>
            <MdiAccount class="-mt-1 mr-2" />
            <span>{{ $t("profile.user_profile") }}</span>
            <template #description>{{ $t("profile.user_profile_sub") }}</template>
          </BaseSectionHeader>
        </template>

        <DetailsSection :details="details" />
        <AdminAvatar v-if="auth.user?.isSuperuser" />

        <div class="p-4">
          <div class="flex gap-2">
            <Button variant="secondary" size="sm" @click="openDialog(DialogID.ChangePassword)">{{ $t("profile.change_password") }}</Button>
            <Button variant="secondary" size="sm" @click="logoutAllDevices">{{ $t("profile.logout_all_devices") }}</Button>
            <Button variant="secondary" size="sm" @click="openDialog(DialogID.DuplicateSettings)">{{ $t("items.duplicate.title") }}</Button>
          </div>
        </div>
        <LanguageSelector />
      </BaseCard>

      <BaseCard>
        <template #title>
          <BaseSectionHeader>
            <span>{{ $t("profile.moved_notice_title") }}</span>
            <template #description>{{ $t("profile.moved_notice_description") }}</template>
          </BaseSectionHeader>
        </template>
        <div class="space-y-2 px-4 pb-4 text-sm text-muted-foreground">
          <p>{{ $t("profile.moved_notice_body") }}</p>
          <div class="flex flex-wrap gap-2">
            <NuxtLink to="/collection/settings" class="text-primary underline">{{ $t("profile.moved_notice_link_settings") }}</NuxtLink>
            <NuxtLink to="/collection/notifiers" class="text-primary underline">{{ $t("profile.moved_notice_link_notifiers") }}</NuxtLink>
            <NuxtLink to="/collection/invites" class="text-primary underline">{{ $t("profile.moved_notice_link_invites") }}</NuxtLink>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <template #title>
          <BaseSectionHeader>
            <MdiDelete class="-mt-1 mr-2" />
            <span>{{ $t("profile.delete_account") }}</span>
            <template #description>{{ $t("profile.delete_account_sub") }}</template>
          </BaseSectionHeader>
        </template>
        <div class="border-t-2 p-4 px-6">
          <Button size="sm" variant="destructive" @click="deleteProfile">{{ $t("profile.delete_account") }}</Button>
        </div>
      </BaseCard>
    </BaseContainer>
  </div>
</template>

<style scoped></style>
