<script setup lang="ts">
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const { title, subtitle, save } = useAdminBranding();
const titleInput = ref(title.value);
const subtitleInput = ref(subtitle.value);
const saving = ref(false);

watch(title, value => (titleInput.value = value));
watch(subtitle, value => (subtitleInput.value = value));

async function saveText() {
  saving.value = true;
  try {
    await save({ title: titleInput.value, subtitle: subtitleInput.value });
    titleInput.value = title.value;
    subtitleInput.value = subtitle.value;
    toast.success("Présentation de l’application mise à jour");
  } catch {
    toast.error("Impossible d’enregistrer la présentation de l’application");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="border-t px-4 py-4">
    <div class="mb-3 font-medium">Présentation de l’application</div>
    <form class="flex max-w-xl flex-col items-start gap-3" @submit.prevent="saveText">
      <div class="w-full space-y-1">
        <label for="branding-title" class="text-sm font-medium">Nom de l’application</label>
        <Input id="branding-title" v-model="titleInput" maxlength="60" placeholder="HomeBox" />
        <p class="text-sm text-muted-foreground">Affiché à la connexion, dans l’en-tête et dans l’onglet du navigateur.</p>
      </div>
      <div class="w-full space-y-1">
        <label for="branding-subtitle" class="text-sm font-medium">Sous-titre de connexion</label>
        <Input id="branding-subtitle" v-model="subtitleInput" maxlength="160" :placeholder="$t('index.tagline')" />
      </div>
      <Button type="submit" size="sm" :disabled="saving">Enregistrer</Button>
    </form>
  </div>
</template>
