<script lang="ts">
  // Route: /messaging/:userID
  // Full implementation in vex-chat-9q0 (DM) — reads $messages[$params.userID]
  let { params }: { params: Record<string, string> } = $props()
</script>

<div class="messaging-placeholder">
  <p class="messaging-placeholder__hint">
    DM with <strong>{params.userID}</strong>
  </p>
  <p class="messaging-placeholder__note">Message rendering → vex-chat-oz0 · vex-chat-9q0</p>
</div>

<style>
  .messaging-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted);
  }

  .messaging-placeholder__hint { font-size: 16px; color: var(--text-secondary); }
  .messaging-placeholder__note { font-size: 12px; color: var(--text-muted); }
</style>
