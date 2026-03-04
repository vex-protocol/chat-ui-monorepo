<script lang="ts">
  let { label = 'Loading...', size = 'md' }: { label?: string; size?: 'sm' | 'md' | 'lg' } = $props()
</script>

<div class="loading loading--{size}" role="status" aria-label={label}>
  <span class="loading__spinner"></span>
  {#if label}
    <span class="loading__label">{label}</span>
  {/if}
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-secondary);
  }

  .loading__spinner {
    display: block;
    border: 2px solid var(--bg-surface);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .loading--sm .loading__spinner { width: 16px; height: 16px; }
  .loading--md .loading__spinner { width: 28px; height: 28px; }
  .loading--lg .loading__spinner { width: 44px; height: 44px; }

  .loading__label { font-size: 13px; color: var(--text-muted); }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
