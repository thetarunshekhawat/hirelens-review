import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Tool results and provider options are untyped JSON at the boundary;
      // they are narrowed where they are read.
      "@typescript-eslint/no-explicit-any": "warn",
      // Reading localStorage after mount is the correct way to restore
      // per-browser state without a hydration mismatch.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "components/ui/**", "scratch/**"]),
]);

export default eslintConfig;
