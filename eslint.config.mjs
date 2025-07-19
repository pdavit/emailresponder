import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import("eslint").Linter.FlatConfig[]} */
const eslintConfig = [
  {
    ignores: ["src/generated/**/*"], // ✅ THIS MUST BE FIRST
  },
  ...compat.extends(
    "next/core-web-vitals",
    "next",
    "next/typescript"
  ),
];

export default eslintConfig;
