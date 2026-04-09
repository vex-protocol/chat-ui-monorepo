import { appImportRestrictions, base } from "@vex-chat/eslint-config/base";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";

export default [
    { ignores: ["dist/**", "build/**", "src-tauri/target/**"] },
    ...base,
    ...svelte.configs["flat/recommended"],
    ...svelte.configs["flat/prettier"],
    {
        files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: [".svelte"],
                parser: tseslint.parser,
            },
        },
        rules: {
            // Svelte uses import() type annotations in $props()
            "@typescript-eslint/consistent-type-imports": "off",
        },
    },
    {
        files: ["**/keystore.ts"],
        rules: {
            // Uses typeof import() for dynamic Tauri plugin types
            "@typescript-eslint/consistent-type-imports": "off",
        },
    },
    {
        rules: {
            ...appImportRestrictions,

            // Strict rules — app code has many any usages from SDK + DOM
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/restrict-template-expressions": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-unsafe-unary-minus": "error",
            "svelte/no-unused-svelte-ignore": "error",
            "svelte/no-at-html-tags": "error",
            "svelte/no-unused-props": "error",
            "@typescript-eslint/restrict-plus-operands": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/only-throw-error": "error",
            "@typescript-eslint/no-unused-expressions": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],

            // Svelte framework group: after builtins, before internal
            "perfectionist/sort-imports": [
                "error",
                {
                    type: "natural",
                    order: "asc",
                    ignoreCase: true,
                    internalPattern: ["^@vex-chat/"],
                    newlinesBetween: 1,
                    customGroups: [
                        {
                            groupName: "type-imports",
                            modifiers: ["type"],
                        },
                        {
                            groupName: "framework",
                            elementNamePattern: "^svelte",
                        },
                    ],
                    groups: [
                        "type-imports",
                        "builtin",
                        "framework",
                        "internal",
                        "external",
                        "parent",
                        "sibling",
                        "index",
                        "unknown",
                    ],
                },
            ],
        },
    },
];
