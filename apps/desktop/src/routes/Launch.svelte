<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'

  // Boot screen — shows while bootstrap() connects.
  // vex-chat-6m0 will wire the store: watch $user atom, redirect when authed.
  onMount(() => {
    const hasSession = document.cookie.includes('session') || localStorage.getItem('vex-authed')
    if (!hasSession) { push('/login') }
    // TODO (vex-chat-6m0): call bootstrap(serverUrl, deviceID, deviceKey)
    //   watch $user atom — when set, push('/server/...' or '/messaging/...')
  })
</script>

<div class="launch">
  <Loading label="Connecting to server..." size="lg" />
</div>

<style>
  .launch {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }
</style>
