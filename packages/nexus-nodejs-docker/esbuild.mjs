import * as esbuild from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  sourcemap: "inline",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outdir: "dist",
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
});
