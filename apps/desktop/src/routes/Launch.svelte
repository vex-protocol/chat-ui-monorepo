<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'

  import { getServerOptions } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'
  import { desktopConfig } from '../lib/platform.js'
  import Loading from '../lib/Loading.svelte'
  import { channels as channelsAtom, servers as serversAtom, user, vexService } from '../lib/store/index.js'

  onMount(async () => {
    try {
      const result = await Promise.race([
        vexService.autoLogin(keyStore, desktopConfig(), getServerOptions()),
        new Promise<{ ok: false }>((resolve) =>
          setTimeout(() => resolve({ ok: false }), 15_000),
        ),
      ])

      if (!result.ok) {
        push('/login')
        return
      }

      const u = user.get()
      if (!u) { push('/login'); return }

      const serverList = Object.values(serversAtom.get())
      if (serverList.length > 0) {
        const sid = serverList[0].serverID
        const chs = channelsAtom.get()[sid] ?? []
        if (chs.length > 0) {
          push(`/server/${sid}/${chs[0].channelID}`)
        } else {
          push('/home')
        }
      } else {
        push('/home')
      }
    } catch {
      push('/login')
    }
  })
</script>

<div class="launch">
  <Loading label="Connecting to server..." size="lg" />
</div>

<style>
  .launch { flex: 1; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); }
</style>
