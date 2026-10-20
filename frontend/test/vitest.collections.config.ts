import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("../", import.meta.url)),
      "#imports": fileURLToPath(new URL("../.nuxt/imports.mjs", import.meta.url)),
    },
  },
  test: { include: ["composables/use-collections.test.ts"] },
});
