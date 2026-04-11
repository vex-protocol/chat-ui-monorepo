import { mount } from "svelte";

import "./app.css";
import App from "./App.svelte";

// Apply saved theme before mount to prevent flash of wrong theme
const savedTheme = localStorage.getItem("vex-theme") ?? "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

const target = document.getElementById("app");
if (!target) {
    throw new Error("#app element not found in DOM");
}

const app = mount(App, {
    target,
});

export default app;
