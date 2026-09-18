<script setup lang="ts">
const auth = useAuthContext();
const api = useUserApi();
const appTitle = useState<string>("admin-app-title", () => "HomeBox");

onMounted(async () => {
  if (!auth.user?.isSuperuser || appTitle.value !== "HomeBox") return;
  const { data, error } = await api.user.getSettings();
  if (!error && data?.item) {
    const saved = typeof data.item.appTitle === "string" ? data.item.appTitle.trim() : "";
    appTitle.value = saved || "HomeBox";
  }
});
</script>

<template>
  <span class="max-w-[15rem] truncate text-xl font-semibold leading-none text-secondary-foreground">
    {{ appTitle }}
  </span>
</template>
