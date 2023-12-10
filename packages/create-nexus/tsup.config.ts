import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  treeshake: true,
  entry: ["./src/index.ts"],
  format: ["cjs"],
  dts: false,
  minify: false,
  clean: true,
  sourcemap: false,
  splitting: false,
  outDir: "dist",
  ...options,
}));
