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
    // TypeScript 5.9.3 type-narrowing regressions produce 200+ false
    // positives across apps/mobile under strictTypeChecked: literal types
    // flagged as "always truthy/falsy", `number > 0` flagged as "always
    // false", `string + string` flagged as invalid operand, unary minus
    // on literal `2` flagged as unsafe, etc. Same class of bug that forced
    // the packages/store override and the apps/desktop .svelte override
    // after the catalog downgrade from TS 6.0.2 → TS ~5.9.3 (required for
    // Expo SDK 55 compatibility).
    //
    // no-useless-default-assignment is included because it incorrectly
    // flags destructure defaults on non-optional props in React Native
    // component signatures where the prop IS optional at the call site
    // but the type inference disagrees.
    //
    // require-await + only-throw-error are included because the same
    // narrowing makes t-e's async-flow analysis unreliable — several
    // RN screens declare methods async for signature stability and
    // throw user-facing strings that get flagged without cause.
    //
    // Remove this override when the catalog moves to TS 6.0.2 (blocked
    // on Expo SDK 55 adding TS 6 support). Tracked in vex-chat-6gm.21
    // alongside the apps/desktop .svelte override and packages/store
    // src/** override.
    {
        files: ["src/**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-useless-default-assignment": "off",
            "@typescript-eslint/no-unsafe-unary-minus": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/only-throw-error": "off",
        },
    },
];
