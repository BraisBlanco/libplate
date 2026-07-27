import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      // Type-only and generated modules have no runtime to cover.
      exclude: ["src/index.ts", "src/model/**", "src/generated/**", "src/version.ts"],
      // At the current numbers, not under them: every line and function is
      // covered, so a drop is a regression rather than noise. The remaining
      // branch gap is defensive fallbacks the metadata cannot reach.
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 98,
        statements: 100,
      },
    },
  },
});
