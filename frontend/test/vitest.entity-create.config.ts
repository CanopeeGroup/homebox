import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["components/Entity/CreateModal.test.ts"] },
});
