<script setup lang="ts">
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const auth = useAuthContext();
const api = useUserApi();
const appTitle = useState<string>("admin-app-title", () => "HomeBox");
const value = ref(appTitle.value);
const loading = ref(false);

async function loadTitle() {
  if (!auth.user?.isSuperuser) return;
  const { data, error } = await api.user.getSettings();
  if (!error && data?.item) {
    const saved = typeof data.item.appTitle === "string" ? data.item.appTitle.trim() : "";
    appTitle.value = saved || "HomeBox";
    value.value = appTitle.value;
  }
}

async function saveTitle() {
  if (!auth.user?.isSuperuser) return;
  const title = value.value.trim().slice(0, 60) || "HomeBox";
  loading.value = true;
  try {
    const { data, error } = await api.user.getSettings();
    if (error || !data?.item) throw new Error("settings");
    const settings = { ...data.item, appTitle: title } as Record<string, unknown>;
    const result = await api.user.setSettings(settings);
    if (result.error) throw new Error("save");
    appTitle.value = title;
    value.value = title;
    toast.success("Titre de l'application mis à jour");
  } catch {
    toast.error("Impossible d'enregistrer le titre de l'application");
  } finally {
    loading.value = false;
  }
}

onMounted(loadTitle);
</script>

<template>
  <div v-if="auth.user?.isSuperuser" class="border-t px-4 py-4">
    <div class="mb-3">
      <div class="font-medium">Titre de l'application</div>
      <div class="text-sm text-muted-foreground">
        Personnalise le nom affiché dans l'en-tête de l'application. Laisser vide pour utiliser HomeBox.
      </div>
    </div>
    <form class="flex max-w-xl flex-col gap-2 sm:flex-row" @submit.prevent="saveTitle">
      <Input v-model="value" maxlength="60" placeholder="HomeBox" />
      <Button type="submit" size="sm" :disabled="loading">Enregistrer</Button>
    </form>
  </div>
</template>
