import { appImportRestrictions, base } from "@vex-chat/eslint-config/base";

export default [
    { ignores: ["dist/**", ".svelte-kit/**", "build/**"] },
    ...base,
    {
        rules: {
            ...appImportRestrictions,
            // Website is a marketing site, not a chat client — fetch is allowed
            // for loading download metadata, privacy policies, and invite previews.
            "no-restricted-globals": "off",
        },
    },
];
