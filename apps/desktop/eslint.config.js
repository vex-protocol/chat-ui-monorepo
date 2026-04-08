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

            // Relax strict rules — app code has many any usages from SDK + DOM
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/no-misused-promises": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/restrict-template-expressions": "warn",
            "@typescript-eslint/no-unnecessary-condition": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-unsafe-unary-minus": "warn",
            "svelte/no-unused-svelte-ignore": "warn",
            "svelte/no-at-html-tags": "warn",
            "svelte/no-unused-props": "warn",
            "@typescript-eslint/restrict-plus-operands": "warn",
            "@typescript-eslint/await-thenable": "warn",
            "@typescript-eslint/only-throw-error": "warn",
            "@typescript-eslint/no-unused-expressions": "warn",
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
