import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  {
    ignores: ["app/openapi-client/types.gen.ts"],
  },
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript", "prettier"],
    rules: { "@typescript-eslint/no-empty-object-type": "off" },
  }),
];

export default eslintConfig;
