<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { bootstrap, user } from '../lib/store/index.js'

  // TODO (vex-chat-vyp): load saved deviceID + deviceKey from secure storage (react-native-keychain / Tauri store)
  // For now, redirect to /login if no session credentials are found.
  const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3000'

  onMount(() => {
    const deviceID = localStorage.getItem('vex-device-id')
    const deviceKeyHex = localStorage.getItem('vex-device-key')

    if (!deviceID || !deviceKeyHex) {
      push('/login')
      return
    }

    const deviceKey = new Uint8Array(
      deviceKeyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    )

    bootstrap(SERVER_URL, deviceID, deviceKey).catch(() => push('/login'))

    // Watch $user — once set, navigate to the main app
    const unsub = user.subscribe((u) => {
      if (u) {
        unsub()
        push('/server/home/general')
      }
    })

    return unsub
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
