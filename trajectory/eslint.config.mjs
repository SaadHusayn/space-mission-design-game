import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Game rules stay framework-free: pure TypeScript that runs in Node tests
    // and can be shared with a multiplayer server later.
    files: ["src/game/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "src/game must not depend on React." },
            { name: "react-dom", message: "src/game must not depend on React." },
            { name: "three", message: "src/game must not depend on Three.js." },
            { name: "zustand", message: "Use zustand/vanilla inside src/game." },
          ],
          patterns: [
            {
              group: ["@react-three/*", "three/*", "next/*", "react/*", "@/three/*", "@/scenes/*", "@/ui/*", "@/components/*", "@/hooks/*"],
              message: "src/game must not depend on rendering or UI code.",
            },
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
