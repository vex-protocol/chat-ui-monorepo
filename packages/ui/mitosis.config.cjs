/** @type {import('@builder.io/mitosis').MitosisConfig} */
module.exports = {
    files: "src/**",
    targets: ["react", "svelte"],
    dest: "output",
    getTargetPath: ({ target }) => target,
    commonOptions: {
        typescript: true,
    },
    options: {
        react: {
            stateType: "useState",
        },
        svelte: {
            stateType: "variables",
        },
    },
};
