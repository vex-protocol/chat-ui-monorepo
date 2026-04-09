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
 * Import restriction rules for apps — enforce SDK-only access to the Vex protocol.
 *
 * Apps must use @vex-chat/libvex (SDK) or @vex-chat/store for ALL server
 * communication. Direct HTTP clients, WebSocket constructors, and internal
 * SDK packages are banned. This ensures the SDK controls auth, encryption,
 * codecs, and reconnection — whether the consumer is a bot, AI agent,
 * Node script, mobile app, or desktop app.
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
                {
                    group: ["axios", "ky", "ofetch", "got", "node-fetch", "undici"],
                    message:
                        "Direct HTTP clients are banned. Use @vex-chat/libvex Client methods for all server communication.",
                },
                {
                    group: ["ws", "websocket", "sockjs-client", "socket.io-client"],
                    message:
                        "Direct WebSocket libraries are banned. The SDK manages WebSocket connections internally.",
                },
            ],
        },
    ],
    "no-restricted-globals": [
        "error",
        {
            name: "fetch",
            message:
                "Direct fetch() is banned in apps. Use @vex-chat/libvex Client methods for all server communication.",
        },
        {
            name: "XMLHttpRequest",
            message:
                "XMLHttpRequest is banned. Use @vex-chat/libvex Client methods for all server communication.",
        },
        {
            name: "WebSocket",
            message:
                "Direct WebSocket construction is banned in apps. The SDK manages WebSocket connections internally.",
        },
    ],
};
