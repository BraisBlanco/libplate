import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // No sourcemaps: tsup emits them without `sourcesContent`, so a published map
  // only points at `../src/*` paths that the tarball does not ship — 1.4 MB of
  // files that resolve to nothing in a consumer's debugger. Debug from source
  // in this repo instead.
  sourcemap: false,
  // Matches tsconfig `target`. Platform-neutral on purpose: `dist/index.js` is
  // loaded straight into a browser by `examples/index.html`.
  target: "es2022",
  treeshake: true,
});
