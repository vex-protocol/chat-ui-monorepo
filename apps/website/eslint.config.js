import { appImportRestrictions, base } from "@vex-chat/eslint-config/base";

export default [
    { ignores: ["dist/**", ".svelte-kit/**", "build/**"] },
    ...base,
    {
        rules: {
            ...appImportRestrictions,
        },
    },
];
