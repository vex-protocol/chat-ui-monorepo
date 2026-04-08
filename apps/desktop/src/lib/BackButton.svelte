<script lang="ts">
  import { pop } from 'svelte-spa-router'

  let { label, onclick }: { label?: string; onclick?: () => void } = $props()

  function handleClick() {
    if (onclick) { onclick() } else { pop() }
  }
</script>

<button class="back-btn" onclick={handleClick} aria-label={label}>
  <span class="back-btn__arrow">←</span>
  <span class="back-btn__label">{label}</span>
</button>

<style>
  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 13px;
    transition: background 0.1s, color 0.1s;
  }

  .back-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .back-btn__arrow { font-size: 15px; }
</style>
