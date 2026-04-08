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

            // Relax strict rules — SDK and React Navigation return `any`
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-misused-promises": "warn",
            "@typescript-eslint/restrict-template-expressions": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/no-require-imports": "warn",
            "@typescript-eslint/no-base-to-string": "warn",
            "@typescript-eslint/no-unnecessary-condition": "warn",
            "@typescript-eslint/no-unsafe-enum-comparison": "warn",
            "@typescript-eslint/no-deprecated": "warn",
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
                            elementNamePattern: "^react",
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
