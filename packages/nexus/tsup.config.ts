import type { Options } from "tsup";
import { defineConfig } from "tsup";

export default defineConfig((options: Options) => ({
  treeshake: true,
  entry: ["./src/**/!(*.test).ts"],
  format: ["cjs"],
  dts: true,
  minify: false,
  clean: true,
  sourcemap: true,
  ...options,
}));
