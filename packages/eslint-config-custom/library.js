const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/*
 * This is a custom ESLint configuration for use with
 * typescript packages.
 *
 * This config extends the Vercel Engineering Style Guide.
 * For more information, see https://github.com/vercel/style-guide
 *
 */

module.exports = {
  extends: [
    "@vercel/style-guide/eslint/node",
    "@vercel/style-guide/eslint/typescript",
  ].map(require.resolve),
  plugins: ["no-only-tests"],
  parserOptions: {
    project,
  },
  globals: {
    React: true,
    JSX: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
      node: {
        extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".test.ts"],
      },
    },
  },
  ignorePatterns: ["node_modules/", "dist/"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "no-implicit-coercion": "off",
    "no-console": "off",
    "no-only-tests/no-only-tests": "error",
    "import/no-default-export": "warn",
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "CallExpression[callee.object.name=/^(describe|it|test)$/][callee.property.name='skip']",
        message: ".skip is not allowed",
      },
    ],
    "padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "directive", next: "*" },
      { blankLine: "always", prev: "*", next: "return" },
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      {
        blankLine: "any",
        prev: ["const", "let", "var"],
        next: ["const", "let", "var"],
      },
      { blankLine: "always", prev: "block-like", next: "*" },
      { blankLine: "always", prev: "*", next: "block-like" },
      { blankLine: "always", prev: "function", next: "*" },
      { blankLine: "always", prev: "*", next: "function" },
      { blankLine: "always", prev: "class", next: "*" },
      { blankLine: "always", prev: "*", next: "class" },
    ],
    "no-await-in-loop": "off",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      { accessibility: "explicit", overrides: { constructors: "no-public" } },
    ],
  },
};
