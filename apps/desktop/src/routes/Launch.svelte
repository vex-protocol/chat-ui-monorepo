<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { bootstrap, user, servers as serversAtom } from '../lib/store/index.js'
  import { getServerUrl, loadCredentials } from '../lib/config.js'
  import { decodeHex } from '@vex-chat/crypto'

  onMount(() => {
    const creds = loadCredentials()

    if (!creds) {
      push('/login')
      return
    }

    const deviceKey = decodeHex(creds.deviceKey)
    const preKeySecret = decodeHex(creds.preKey)

    bootstrap(getServerUrl(), creds.deviceID, deviceKey, undefined, preKeySecret)
      .catch(() => push('/login'))

    // Watch $user — once set, navigate to the main app
    const unsub = user.subscribe((u) => {
      if (u) {
        unsub()
        const serverList = Object.values(serversAtom.get())
        if (serverList.length > 0) {
          push(`/server/${serverList[0]!.serverID}/`)
        } else {
          push('/settings')
        }
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
