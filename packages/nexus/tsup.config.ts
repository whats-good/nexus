import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  treeshake: true,
  entry: ["./src/lib/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  minify: false,
  clean: true,
  sourcemap: true,
  splitting: true,
  outDir: "dist",
  ...options,
}));
