import { base } from "@vex-chat/eslint-config/base";

export default [
    { ignores: ["dist/**"] },
    ...base,
    {
        rules: {
            // Store interacts heavily with Client SDK which returns `any`
            // from msgpack decode. Fix when SDK adds typed returns.
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/restrict-plus-operands": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_" },
            ],

            // Store must not touch the network directly
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: [
                                "axios",
                                "ky",
                                "ofetch",
                                "got",
                                "node-fetch",
                                "undici",
                            ],
                            message:
                                "Direct HTTP clients are banned in store. Network access goes through the SDK.",
                        },
                        {
                            group: [
                                "ws",
                                "websocket",
                                "sockjs-client",
                                "socket.io-client",
                            ],
                            message:
                                "Direct WebSocket libraries are banned in store. The SDK manages connections.",
                        },
                    ],
                },
            ],
            "no-restricted-globals": [
                "error",
                {
                    name: "fetch",
                    message:
                        "Direct fetch() is banned in store. Network access goes through the SDK.",
                },
                {
                    name: "XMLHttpRequest",
                    message:
                        "XMLHttpRequest is banned in store. Network access goes through the SDK.",
                },
                {
                    name: "WebSocket",
                    message:
                        "Direct WebSocket is banned in store. The SDK manages connections.",
                },
            ],

            // Apps import SDK types directly — store must not re-export them
            "no-restricted-syntax": [
                "error",
                {
                    selector:
                        "ExportNamedDeclaration[source.value='@vex-chat/libvex']",
                    message:
                        "Do not re-export from @vex-chat/libvex. Apps import SDK types directly.",
                },
                {
                    selector:
                        "ExportAllDeclaration[source.value='@vex-chat/libvex']",
                    message:
                        "Do not re-export from @vex-chat/libvex. Apps import SDK types directly.",
                },
            ],
        },
    },
    // TypeScript 5.9.3 type-narrowing regressions produce a storm of
    // false positives on packages/store under strictTypeChecked: literal
    // types like `0 < id.length` flagged as "always true", `number + number`
    // flagged as invalid operand, Set.add() flagged as confusing-void, etc.
    // Same class of bug that forced the .svelte override in apps/desktop —
    // typescript-eslint's type inference through TS 5.9.3 over-narrows
    // literal and generic types.
    //
    // require-await + only-throw-error also included because the type
    // narrowing affects their analysis too (service.ts createInvite /
    // getChannelMembers / getInvites are declared async for signature
    // stability; the throw-error site at service.ts:602 throws a value
    // whose type t-e can't follow under 5.9.3).
    //
    // Remove this override when the catalog moves to TS 6.0.2 (blocked on
    // Expo SDK 55 adding TS 6 support). Tracked in vex-chat-6gm.21
    // alongside the apps/desktop .svelte override.
    {
        files: ["src/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/only-throw-error": "off",
        },
    },
];
