<script lang="ts">
  import { avatarHue } from '@vex-chat/store'

  interface Props {
    userID: string
    serverUrl: string
    /** Cache-bust version — increment after upload to force reload */
    version?: number
    size?: number
    /** Display name or username for initials fallback */
    name?: string
  }

  let { userID, serverUrl, version = 0, size = 32, name }: Props = $props()

  let failed = $state(false)

  // Re-attempt image load whenever version changes (after upload)
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    version
    failed = false
  })

  function initials(id: string, displayName?: string): string {
    if (displayName) return displayName.slice(0, 2).toUpperCase()
    return id.slice(0, 2).toUpperCase()
  }
</script>

{#if !failed}
  <img
    src="{serverUrl}/avatar/{userID}?v={version}"
    alt={name ?? userID}
    width={size}
    height={size}
    class="avatar"
    style="width:{size}px;height:{size}px;border-radius:50%"
    onerror={() => { failed = true }}
  />
{:else}
  <div
    class="avatar avatar--fallback"
    style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.4)}px;background:hsl({avatarHue(userID)},45%,40%)"
    aria-label={name ?? userID}
  >
    {initials(userID, name)}
  </div>
{/if}

<style>
  .avatar {
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    display: inline-flex;
  }

  .avatar--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    letter-spacing: 0.02em;
    user-select: none;
  }
</style>
