import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const SPIRE_URL =
    process.env.VITE_PROXY_TARGET ||
    process.env.VITE_SERVER_URL ||
    "https://api.vex.wtf";
const spire = { changeOrigin: true, target: SPIRE_URL } as const;

// https://vite.dev/config/
export default defineConfig({
    build: {
        // Don't minify for debug builds
        minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
        // Tauri supports es2021
        target: "es2021",
    },
    // Hide native browser env APIs from Tauri frontend
    envPrefix: ["VITE_", "TAURI_ENV_*"],
    plugins: [svelte()],
    // Tauri expects a fixed port and doesn't need the browser to open
    server: {
        port: 5180,
        // Proxy API requests to spire so the WebView never makes cross-origin HTTP requests
        proxy: {
            "/auth": spire,
            "/avatar": spire,
            "/channel": spire,
            "/device": spire,
            "/deviceList": spire,
            "/emoji": spire,
            "/file": spire,
            "/goodbye": spire,
            "/invite": spire,
            "/permission": spire,
            "/register": spire,
            "/server": spire,
            "/socket": { changeOrigin: true, target: SPIRE_URL, ws: true },
            "/token": spire,
            "/user": spire,
            "/userList": spire,
            "/whoami": spire,
        },
        strictPort: true,
    },
});
