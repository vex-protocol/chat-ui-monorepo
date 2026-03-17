<script lang="ts">
  import CreateServerModal from '../lib/CreateServerModal.svelte'

  let showCreate = $state(false)
</script>

<div class="home">
  <div class="home__card">
    <h1 class="home__title">Welcome to Vex</h1>
    <p class="home__subtitle">Create a server to get started, or wait for an invite.</p>

    <button class="home__create" onclick={() => { showCreate = true }}>
      Create a Server
    </button>
  </div>
</div>

{#if showCreate}
  <CreateServerModal onclose={() => { showCreate = false }} />
{/if}

<style>
  .home {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }

  .home__card {
    text-align: center;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .home__title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .home__subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .home__create {
    margin-top: 8px;
    background: var(--accent);
    color: #fff;
    padding: 10px 24px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    transition: opacity 0.15s;
  }

  .home__create:hover {
    opacity: 0.9;
  }
</style>
