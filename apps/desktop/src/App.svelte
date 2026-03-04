<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener'
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from '/vite.svg'
  import Counter from './lib/Counter.svelte'
</script>

<main>
  <div>
    <button class="logo-btn" onclick={() => openUrl('https://vite.dev')} aria-label="Open Vite docs">
      <img src={viteLogo} class="logo" alt="Vite Logo" />
    </button>
    <button class="logo-btn" onclick={() => openUrl('https://svelte.dev')} aria-label="Open Svelte docs">
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </button>
  </div>
  <h1>Vite + Svelte</h1>

  <div class="card">
    <Counter />
  </div>

  <p>
    Check out <button class="inline-link" onclick={() => openUrl('https://github.com/sveltejs/kit#readme')}>SvelteKit</button>, the official Svelte app framework powered by Vite!
  </p>

  <p class="read-the-docs">
    Click on the Vite and Svelte logos to learn more
  </p>
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }
  .logo-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .inline-link {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
  }
</style>
