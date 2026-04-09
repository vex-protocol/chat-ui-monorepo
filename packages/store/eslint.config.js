import { base } from "@vex-chat/eslint-config/base";

export default [
    { ignores: ["dist/**"] },
    ...base,
    {
        rules: {
            // Store interacts heavily with Client SDK which returns `any`
            // from msgpack decode. Fix when SDK adds typed returns.
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/restrict-plus-operands": "warn",
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
];
