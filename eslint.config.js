/**
 * Root ESLint config — fallback for files at the repo root.
 * Each app/package has its own eslint.config.js that imports
 * from @vex-chat/eslint-config/base.
 */
import { base } from "@vex-chat/eslint-config/base";

export default [
    { ignores: ["apps/**", "packages/**", "node_modules/**", "scripts/**"] },
    ...base,
];
