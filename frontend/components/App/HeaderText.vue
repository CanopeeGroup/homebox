<script setup lang="ts">
const { title, load } = useAdminBranding();
onMounted(() => void load());
</script>

<template>
  <span class="max-w-[15rem] truncate text-xl font-semibold leading-none text-secondary-foreground">
    {{ title }}
  </span>
</template>
