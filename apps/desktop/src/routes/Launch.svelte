<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { tauriPreset } from '@vex-chat/libvex/preset/tauri'
  import { autoLogin } from '../lib/store/index.js'
  import { servers as serversAtom, channels as channelsAtom, user } from '../lib/store/index.js'
  import { getServerUrl } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'

  onMount(async () => {
    const SERVER_URL = getServerUrl()
    const result = await autoLogin(keyStore, tauriPreset(), {
      host: SERVER_URL,
      unsafeHttp: SERVER_URL.startsWith('http:'),
    })

    if (!result.ok) {
      push('/login')
      return
    }

    const u = user.get()
    if (!u) { push('/login'); return }

    // Navigate to first server/channel or home
    const serverList = Object.values(serversAtom.get())
    if (serverList.length > 0) {
      const sid = serverList[0]!.serverID
      const chs = channelsAtom.get()[sid] ?? []
      if (chs.length > 0) {
        push(`/server/${sid}/${chs[0]!.channelID}`)
      } else {
        push('/home')
      }
    } else {
      push('/home')
    }
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
