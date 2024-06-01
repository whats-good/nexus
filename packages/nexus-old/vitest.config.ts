import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    alias: {
      "@src": "./src",
      "@test": "./test",
    },
    silent: true,
  },
});
