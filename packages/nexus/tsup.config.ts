import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  treeshake: true,
  entry: ["./src/fetch.ts", "./src/node.ts"],
  format: ["cjs"],
  dts: true,
  minify: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  outDir: "dist",
  ...options,
}));
