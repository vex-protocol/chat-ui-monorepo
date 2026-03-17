<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import Loading from '../lib/Loading.svelte'
  import { bootstrap, user, messages, groupMessages, client, servers as serversAtom, channels as channelsAtom } from '../lib/store/index.js'
  import { getServerUrl } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'
  import { decodeHex } from '@vex-chat/crypto'
  import { loadAllMessages, saveMessage } from '../lib/persistence.js'

  onMount(async () => {
    const creds = await keyStore.loadActive()

    if (!creds || !creds.token) {
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
      .then(() => bootstrap(getServerUrl(), creds.deviceID, deviceKey, creds.token, preKeySecret))
      .then(async () => {
        const c = client.get()
        if (!c) return

        // Navigate now that bootstrap is complete (servers + channels loaded)
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
