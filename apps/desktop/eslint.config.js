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
            // Svelte components must use the barrel (lib/store/index.ts) for
            // atoms — it strips the $ prefix so Svelte's reactive $ works.
            // Plain .ts files may import @vex-chat/store directly.
            "no-restricted-imports": [
                "error",
                {
                    paths: [
                        {
                            name: "@vex-chat/store",
                            message:
                                "Svelte components must import from '$lib/store' (the barrel) so the $ prefix aliasing works correctly.",
                        },
                    ],
                },
            ],
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
            // TS 5.9.3 narrowing false positives. Same class of bug that
            // forced the packages/store override and the apps/mobile
            // override. Re-enable when the catalog moves to TS 6.0.2
            // (tracked under vex-chat-6gm.21).
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-confusing-void-expression": "off",
            // TS 5.9.3 narrowing false positives — see comment above.
            "@typescript-eslint/no-unsafe-unary-minus": "off",
            "svelte/no-unused-svelte-ignore": "error",
            "svelte/no-at-html-tags": "error",
            "svelte/no-unused-props": "error",
            // TS 5.9.3 narrowing false positives — see comment above.
            "@typescript-eslint/restrict-plus-operands": "off",
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
    // Svelte 5 + TypeScript 5.9.3 narrowing false positives. When we
    // downgraded the catalog typescript from ^6.0.2 → ~5.9.3 (needed
    // because Expo SDK 55 doesn't support TS 6), typescript-eslint's
    // type narrowing through svelte-eslint-parser started reporting
    // Svelte 5 runes types as more specific than they are. The rules
    // below produce false positives ONLY on .svelte files — plain .ts
    // files in apps/desktop (keystore.ts, config.ts, stores/theme.ts)
    // still get the full check.
    //
    // Specific false positives observed:
    //   - no-unnecessary-condition: $props() optional destructuring
    //     (`let { onclick }: { onclick?: () => void } = $props()`)
    //     reported as "always truthy"
    //   - only-throw-error: plain `throw new Error("...")` reported
    //     as "expected an error object to be thrown"
    //   - no-unsafe-unary-minus: `tabindex={-1}` reported because the
    //     literal `1` is narrowed to the literal type `1` instead of
    //     `number`
    //   - restrict-plus-operands: `"a" + "b"` where both are `string`
    //     reported as invalid operand type
    //   - no-meaningless-void-operator: `void stringVar` (used to
    //     force Svelte reactive dep tracking) reported as meaningless
    //
    // Remove this override when either:
    //   - apps/desktop moves to TS 6.0.2 (blocked on svelte-check TS 6
    //     support; track upstream at sveltejs/svelte-check)
    //   - svelte-eslint-parser fixes rune-type narrowing under TS 5.9
    //
    // Tracked in vex-chat-6gm.21.
    {
        files: ["**/*.svelte"],
        rules: {
            "@typescript-eslint/no-meaningless-void-operator": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unsafe-unary-minus": "off",
            "@typescript-eslint/only-throw-error": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
        },
    },
];
