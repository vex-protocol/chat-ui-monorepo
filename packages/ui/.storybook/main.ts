import type { StorybookConfig } from "@storybook/react-vite";

// Composition host: no local stories, refs to React and Svelte instances
const config: StorybookConfig = {
    stories: [],
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    refs: {
        react: { title: "React", url: "http://localhost:6001" },
        svelte: { title: "Svelte", url: "http://localhost:6002" },
    },
};

export default config;
