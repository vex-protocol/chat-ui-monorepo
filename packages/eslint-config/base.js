/**
 * Shared ESLint base config for all Vex packages.
 *
 * Includes: typescript-eslint strictTypeChecked, perfectionist natural sorting
 * with import grouping, prettier compat.
 *
 * Apps add framework-specific plugins in their own eslint.config.js.
 */
import eslintConfigPrettier from "eslint-config-prettier/flat";
import perfectionist from "eslint-plugin-perfectionist";
import tseslint from "typescript-eslint";

export const base = tseslint.config(
    ...tseslint.configs.strictTypeChecked,
    perfectionist.configs["recommended-natural"],
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    fixStyle: "separate-type-imports",
                },
            ],
            "@typescript-eslint/consistent-type-exports": "error",

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
                    ],
                    groups: [
                        "type-imports",
                        "builtin",
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
    eslintConfigPrettier,
);

/**
 * Import restriction rule for apps — ban direct imports from
 * @vex-chat/types and @vex-chat/crypto. Apps should only import
 * from @vex-chat/libvex or @vex-chat/store.
 */
export const appImportRestrictions = {
    "no-restricted-imports": [
        "error",
        {
            patterns: [
                {
                    group: ["@vex-chat/types", "@vex-chat/crypto"],
                    message:
                        "Import from @vex-chat/libvex or @vex-chat/store instead. Direct type/crypto imports are for SDK internals only.",
                },
            ],
        },
    ],
};
