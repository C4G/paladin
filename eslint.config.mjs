import nextConfig from "eslint-config-next";

const eslintConfig = [
  {
    ignores: ["**/node_modules/**", "**/.next/**", ".next/**", "node_modules/**", "**/.source/**", ".source/**"],
  },
  ...nextConfig,
  {
    rules: {
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],
    },
  },
];

export default eslintConfig;