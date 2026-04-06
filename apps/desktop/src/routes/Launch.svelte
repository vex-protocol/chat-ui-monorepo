<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { autoLogin } from '@vex-chat/store'
  import { browserAdapters } from '@vex-chat/libvex'
  import { createTauriStorage } from '@vex-chat/libvex/storage/tauri'
  import type { ILogger } from '@vex-chat/libvex'
  import { servers as serversAtom, channels as channelsAtom, user } from '../lib/store/index.js'
  import { getServerUrl } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'

  const desktopLogger: ILogger = {
    info: (msg: string) => console.log(msg),
    warn: (msg: string) => console.warn(msg),
    error: (msg: string) => console.error(msg),
    debug: (msg: string) => console.debug(msg),
  }

  onMount(async () => {
    const SERVER_URL = getServerUrl()
    const opts = {
      host: SERVER_URL,
      unsafeHttp: SERVER_URL.startsWith('http:'),
      adapters: browserAdapters(),
    }

    // Load credentials to create storage with the right key
    const creds = await keyStore.load()
    const storage = creds
      ? createTauriStorage('vex-client.db', creds.deviceKey, desktopLogger, opts)
      : undefined

    const result = await autoLogin(keyStore, opts, undefined, storage)

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
