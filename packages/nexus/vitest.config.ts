import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    alias: {
      "@lib": "./src/lib",
      "@test": "./test",
    },
    silent: true,
  },
});
