import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Root pages/ is an FSD placeholder; the rule would treat src/pages slices as Pages Router routes.
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  {
    // Feature-Sliced Design: imports go only downwards through the layers.
    // Cross-imports between entities are allowed only through a slice's `@x` folder.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "pages", pattern: "src/pages/*", capture: ["slice"] },
        { type: "widgets", pattern: "src/widgets/*", capture: ["slice"] },
        { type: "features", pattern: "src/features/*", capture: ["slice"] },
        { type: "entities", pattern: "src/entities/*", capture: ["slice"] },
        { type: "shared", pattern: "src/shared" },
      ],
      "boundaries/files": [
        { category: "cross-import", pattern: "src/entities/*/@x/*" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            { from: { element: { type: "app" } }, allow: { to: { element: { types: { anyOf: ["app", "pages", "widgets", "features", "entities", "shared"] } } } } },
            { from: { element: { type: "pages" } }, allow: { to: { element: { types: { anyOf: ["widgets", "features", "entities", "shared"] } } } } },
            { from: { element: { type: "widgets" } }, allow: { to: { element: { types: { anyOf: ["features", "entities", "shared"] } } } } },
            { from: { element: { type: "features" } }, allow: { to: { element: { types: { anyOf: ["entities", "shared"] } } } } },
            { from: { element: { type: "entities" } }, allow: { to: { element: { type: "shared" } } } },
            { from: { element: { type: "shared" } }, allow: { to: { element: { type: "shared" } } } },
            // a slice may import itself
            {
              from: { element: { types: { anyOf: ["pages", "widgets", "features", "entities"] } } },
              allow: { to: { element: { type: "{{ from.element.type }}", captured: { slice: "{{ from.element.captured.slice }}" } } } },
            },
            // entity -> entity only through @x
            { from: { element: { type: "entities" } }, allow: { to: { file: { categories: "cross-import" } } } },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
