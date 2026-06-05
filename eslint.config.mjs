// @ts-check
import { defineConfig } from "eslint";

export default defineConfig({
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
});
