<script lang="ts">
  // Route: /server/:serverID/:channelID
  // Full implementation in vex-chat-14y (group chat) — reads $groupMessages[$params.channelID]
  let { params }: { params: Record<string, string> } = $props()
</script>

<div class="server-channel-placeholder">
  <p class="server-channel-placeholder__hint">
    <strong>#{params.channelID}</strong>
  </p>
  <p class="server-channel-placeholder__note">Group chat → vex-chat-oz0 · vex-chat-14y</p>
</div>

<style>
  .server-channel-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .server-channel-placeholder__hint { font-size: 16px; color: var(--text-secondary); }
  .server-channel-placeholder__note { font-size: 12px; color: var(--text-muted); }
</style>
