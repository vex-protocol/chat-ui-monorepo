import { appImportRestrictions, base } from "@vex-chat/eslint-config/base";
import svelte from "eslint-plugin-svelte";

export default [
    { ignores: ["dist/**", "build/**", "src-tauri/target/**"] },
    ...base,
    ...svelte.configs["flat/recommended"],
    ...svelte.configs["flat/prettier"],
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: [".svelte"],
            },
        },
    },
    {
        rules: {
            ...appImportRestrictions,

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
