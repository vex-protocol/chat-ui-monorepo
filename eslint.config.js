import ts from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    {
        files: ["**/*.ts"],
        languageOptions: { parser },
        plugins: { "@typescript-eslint": ts },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
    eslintConfigPrettier,
];
