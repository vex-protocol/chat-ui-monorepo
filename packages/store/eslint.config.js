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
        },
    },
];
