import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const SPIRE_URL = process.env.VITE_SERVER_URL || "http://localhost:16777";
const spire = { target: SPIRE_URL, changeOrigin: true } as const;

// https://vite.dev/config/
export default defineConfig({
    plugins: [svelte()],
    // Tauri expects a fixed port and doesn't need the browser to open
    server: {
        port: 5180,
        strictPort: true,
        // Proxy API requests to spire so the WebView never makes cross-origin HTTP requests
        proxy: {
            "/token": spire,
            "/register": spire,
            "/auth": spire,
            "/whoami": spire,
            "/goodbye": spire,
            "/user": spire,
            "/device": spire,
            "/server": spire,
            "/channel": spire,
            "/file": spire,
            "/avatar": spire,
            "/invite": spire,
            "/emoji": spire,
            "/permission": spire,
            "/userList": spire,
            "/deviceList": spire,
            "/socket": { target: SPIRE_URL, changeOrigin: true, ws: true },
        },
    },
    // Hide native browser env APIs from Tauri frontend
    envPrefix: ["VITE_", "TAURI_ENV_*"],
    define: {
        // libvex deps (axios, browser-or-node) check process.env at runtime.
        // Tauri webview has no process global — provide safe defaults.
        "process.env.NODE_ENV": JSON.stringify("production"),
        "process.env": "{}",
        "process.versions": "undefined",
        "process.platform": JSON.stringify("browser"),
    },
    build: {
        // Tauri supports es2021
        target: "es2021",
        // Don't minify for debug builds
        minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
});
