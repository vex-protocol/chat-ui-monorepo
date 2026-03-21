<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { autoLogin, $messages as messagesAtom, $groupMessages as groupMessagesAtom } from '@vex-chat/store'
  import { servers as serversAtom, channels as channelsAtom, user } from '../lib/store/index.js'
  import { getServerUrl } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'
  import { desktopPersistence, saveMessage } from '../lib/persistence.js'

  onMount(async () => {
    const result = await autoLogin(keyStore, getServerUrl(), desktopPersistence)

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

    // Persist message changes to IndexedDB (sent + received).
    // listen() fires only on changes (not initial value), and IndexedDB put is idempotent.
    const currentUserID = u.userID
    const savedMailIDs = new Set<string>()
    messagesAtom.listen((dms) => {
      for (const msgs of Object.values(dms)) {
        for (const mail of msgs) {
          if (!savedMailIDs.has(mail.mailID)) {
            savedMailIDs.add(mail.mailID)
            saveMessage(mail, currentUserID).catch(() => {})
          }
        }
      }
    })
    groupMessagesAtom.listen((groups) => {
      for (const msgs of Object.values(groups)) {
        for (const mail of msgs) {
          if (!savedMailIDs.has(mail.mailID)) {
            savedMailIDs.add(mail.mailID)
            saveMessage(mail, currentUserID).catch(() => {})
          }
        }
      }
    })
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
