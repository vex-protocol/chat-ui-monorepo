<script lang="ts">
  let { serverID = '' }: { serverID?: string } = $props()
</script>

<aside class="members-panel" aria-label="Members">
  <div class="members-panel__header">
    <span class="members-panel__title">Members</span>
  </div>

  <div class="members-panel__empty">
    <p class="members-panel__empty-text">Member list will appear here once the server members endpoint is available.</p>
  </div>
</aside>

<style>
  .members-panel {
    width: 220px;
    flex-shrink: 0;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .members-panel__header {
    padding: 12px 12px 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .members-panel__title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .members-panel__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .members-panel__empty-text {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    font-style: italic;
    line-height: 1.5;
  }
</style>
