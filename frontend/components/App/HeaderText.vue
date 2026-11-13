<script setup lang="ts">
const { title } = useAdminBranding();
</script>

<template>
  <span class="max-w-[15rem] truncate text-xl font-semibold leading-none text-secondary-foreground">
    {{ title }}
  </span>
</template>
