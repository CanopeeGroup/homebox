<script setup lang="ts">
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

const auth = useAuthContext();
const { avatar, load, save } = useAdminBranding();
const loading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

async function persistAvatar(value: string | null) {
  loading.value = true;
  try {
    await save({ avatar: value });
    toast.success(value ? "Avatar mis à jour" : "Avatar supprimé");
  } catch {
    toast.error("Impossible d'enregistrer l'avatar");
  } finally {
    loading.value = false;
  }
}

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image"));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/webp", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function selectAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast.error("Le fichier sélectionné doit être une image");
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    toast.error("L'image ne doit pas dépasser 8 Mo");
    return;
  }
  try {
    await persistAvatar(await resizeImage(file));
  } catch {
    toast.error("Impossible de traiter cette image");
  }
}

onMounted(() => void load());
</script>

<template>
  <div v-if="auth.user?.isSuperuser" class="border-t px-4 py-4">
    <div class="mb-3">
      <div class="font-medium">Avatar administrateur</div>
      <div class="text-sm text-muted-foreground">Cet avatar remplace le grand logo Homebox dans la barre latérale.</div>
    </div>
    <div class="flex items-center gap-4">
      <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-accent">
        <img v-if="avatar" :src="avatar" alt="Avatar administrateur" class="size-full object-cover" />
        <AppLogo v-else class="size-14" />
      </div>
      <div class="flex flex-wrap gap-2">
        <input ref="fileInput" class="hidden" type="file" accept="image/*" @change="selectAvatar" />
        <Button size="sm" variant="secondary" :disabled="loading" @click="fileInput?.click()">Choisir une image</Button>
        <Button v-if="avatar" size="sm" variant="destructive" :disabled="loading" @click="persistAvatar(null)">Supprimer</Button>
      </div>
    </div>
  </div>
</template>
