import { appImportRestrictions, base } from "@vex-chat/eslint-config/base";
// TODO: eslint-plugin-react@7.37 doesn't support ESLint 10 (peer dep caps at ^9.7)
// Add react.configs.flat.recommended when they release ESLint 10 support
import reactHooks from "eslint-plugin-react-hooks";

export default [
    { ignores: ["dist/**", ".expo/**", "ios/**", "android/**"] },
    ...base,
    reactHooks.configs.flat.recommended,
    {
        rules: {
            ...appImportRestrictions,

            // Strict rules — SDK and React Navigation return `any`
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/restrict-template-expressions": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-require-imports": "error",
            "@typescript-eslint/no-base-to-string": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/no-unsafe-enum-comparison": "error",
            "@typescript-eslint/no-deprecated": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],

            // React framework group: after builtins, before internal
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
                            elementNamePattern: "^react(-native)?$",
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
