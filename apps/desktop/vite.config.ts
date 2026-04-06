import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const SPIRE_URL = process.env.VITE_SERVER_URL || 'http://localhost:16777'
const spire = { target: SPIRE_URL, changeOrigin: true } as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  define: {
    // Some npm packages access process.env at runtime (axios, etc.).
    // Tauri's WebView has no `process` global. Provide a shim.
    'process.env': '{}',
  },
  resolve: {
    // Ensure Vite uses browser builds of packages like axios.
    conditions: ['browser', 'import', 'default'],
    // Don't follow symlinks into sibling repo node_modules — prevents
    // Vite from resolving Node-only optional deps (winston, ws, etc.)
    // that are installed in libvex-js but not needed for the browser.
    preserveSymlinks: true,
  },
  // Tauri expects a fixed port and doesn't need the browser to open
  server: {
    port: 5180,
    strictPort: true,
    // Proxy API requests to spire so the WebView never makes cross-origin HTTP requests
    proxy: {
      '/token': spire,
      '/register': spire,
      '/auth': spire,
      '/whoami': spire,
      '/goodbye': spire,
      '/user': spire,
      '/device': spire,
      '/server': spire,
      '/channel': spire,
      '/file': spire,
      '/avatar': spire,
      '/invite': spire,
      '/emoji': spire,
      '/permission': spire,
      '/userList': spire,
      '/deviceList': spire,
      '/socket': { target: SPIRE_URL, changeOrigin: true, ws: true },
    },
  },
  // Hide native browser env APIs from Tauri frontend
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Tauri supports es2021
    target: 'es2021',
    // Don't minify for debug builds
    minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
