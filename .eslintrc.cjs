/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    node: true,
  },
  ignorePatterns: ["build/", "node_modules/"],

  // Base config
  extends: ["eslint:recommended", "plugin:prettier/recommended"],

  plugins: ["prettier"],

  rules: {
    "prettier/prettier": "error",
  },

  overrides: [
    // React and Remix
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: ["react", "jsx-a11y"],
      extends: [
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
      ],
      settings: {
        react: {
          version: "detect",
        },
        formComponents: ["Form"],
        linkComponents: [
          { name: "Link", linkAttribute: "to" },
          { name: "NavLink", linkAttribute: "to" },
        ],
        "import/resolver": {
          typescript: {},
        },
      },
      rules: {
        // Enforce JSX in TSX files only
        "react/jsx-filename-extension": [1, { extensions: [".tsx"] }],
      },
    },

    // TypeScript
    {
      files: ["**/*.{ts,tsx}"],
      plugins: ["@typescript-eslint", "import"],
      parser: "@typescript-eslint/parser",
      settings: {
        "import/internal-regex": "^~/",
        "import/resolver": {
          node: {
            extensions: [".ts", ".tsx"],
          },
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
      ],
      rules: {
        // Disable explicit function return types for flexibility
        "@typescript-eslint/explicit-function-return-type": "off",
      },
    },

    // Node-specific rules for server files
    {
      files: [".eslintrc.cjs", "server/**/*.{js,ts}"],
      env: {
        node: true,
      },
      rules: {
        "no-console": "off", // Allow console in server files
      },
    },
  ],
};
