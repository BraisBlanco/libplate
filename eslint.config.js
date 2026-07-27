import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    // Generated code, build output, coverage and root config files are not
    // linted (config files are TS but live outside the tsconfig project).
    ignores: [
      "dist/**",
      "coverage/**",
      "src/generated/**",
      "node_modules/**",
      // Stryker's sandbox is a full copy of the project, plus generated
      // harness files; linting it reports the same code twice.
      ".stryker-tmp/**",
      "reports/**",
      "*.config.ts",
      "eslint.config.js",
    ],
  },
  // Library + tests: full type-checked linting.
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      sonarjs.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Unused imports/vars: let the dedicated plugin own this (with autofix).
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Complexity budgets — the TS analogue of PMD/Sonar thresholds.
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 4],
      "max-lines-per-function": [
        "warn",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
      "sonarjs/cognitive-complexity": ["warn", 15],
    },
  },
  {
    // Tests exercise many cases; relax size/duplication limits there.
    files: ["test/**/*.ts"],
    rules: {
      "max-lines-per-function": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
  {
    // Build scripts: plain Node ESM, no type-aware linting.
    files: ["scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
  },
  prettier,
);
