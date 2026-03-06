<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { bootstrap, user, messages, groupMessages, client, servers as serversAtom } from '../lib/store/index.js'
  import { getServerUrl, loadCredentials } from '../lib/config.js'
  import { decodeHex } from '@vex-chat/crypto'
  import { loadAllMessages, saveMessage } from '../lib/persistence.js'

  onMount(() => {
    const creds = loadCredentials()

    if (!creds) {
      push('/login')
      return
    }

    const deviceKey = decodeHex(creds.deviceKey)
    const preKeySecret = decodeHex(creds.preKey)

    // Load persisted messages into atoms before bootstrap (bootstrap doesn't
    // overwrite $messages — no history endpoints exist yet), then connect.
    loadAllMessages()
      .then(({ dms, groups }) => {
        for (const [key, msgs] of Object.entries(dms)) messages.setKey(key, msgs)
        for (const [key, msgs] of Object.entries(groups)) groupMessages.setKey(key, msgs)
      })
      .catch(() => {})
      .then(() => bootstrap(getServerUrl(), creds.deviceID, deviceKey, undefined, preKeySecret))
      .then(async () => {
        const c = client.get()
        if (!c) return

        // Persist incoming real-time messages
        c.on('mail', (mail) => {
          const u = user.get()
          if (u) saveMessage(mail, u.userID).catch(() => {})
        })

        // Fetch pending offline messages, add to atoms and persist
        const u = user.get()
        if (!u) return
        const pending = await c.fetchInbox()
        for (const mail of pending) {
          if (mail.group) {
            const prev = groupMessages.get()[mail.group] ?? []
            if (!prev.some(m => m.mailID === mail.mailID)) {
              groupMessages.setKey(mail.group, [...prev, mail])
            }
          } else {
            const threadKey = mail.authorID === u.userID ? mail.readerID : mail.authorID
            const prev = messages.get()[threadKey] ?? []
            if (!prev.some(m => m.mailID === mail.mailID)) {
              messages.setKey(threadKey, [...prev, mail])
            }
          }
          saveMessage(mail, u.userID).catch(() => {})
        }
      })
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
