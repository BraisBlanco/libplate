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
      // Set just under the current numbers: the gap to 100% is a handful of
      // defensive fallbacks, so any real drop is a regression, not noise.
      thresholds: {
        lines: 99,
        functions: 100,
        branches: 96,
        statements: 99,
      },
    },
  },
});
