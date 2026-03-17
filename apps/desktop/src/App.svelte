<script lang="ts">
  import Router, { location, push } from 'svelte-spa-router'
  import ServerBar from './lib/ServerBar.svelte'
  import ChannelBar from './lib/ChannelBar.svelte'
  import UserMenu from './lib/UserMenu.svelte'

  import Launch from './routes/Launch.svelte'
  import Login from './routes/Login.svelte'
  import Register from './routes/Register.svelte'
  import Messaging from './routes/Messaging.svelte'
  import ServerChannel from './routes/ServerChannel.svelte'
  import Settings from './routes/Settings.svelte'
  import Home from './routes/Home.svelte'

  import FamiliarsList from './lib/FamiliarsList.svelte'
  import MembersPanel from './lib/MembersPanel.svelte'
  import { user, keyReplaced, servers, channels, client } from './lib/store/index.js'
  import { setupNotifications } from './lib/notifications.js'
  import { setupTray } from './lib/tray.js'
  import { setupDeepLinks } from './lib/deeplink.js'

  const routes = {
    '/':                            Launch,
    '/launch':                      Launch,
    '/login':                       Login,
    '/register':                    Register,
    '/home':                        Home,
    '/settings':                    Settings,
    '/messaging/:userID':           Messaging,
    '/server/:serverID/:channelID': ServerChannel,
    '*':                            Launch,
  }

  // Auth routes show no sidebars
  const AUTH_ROUTES = ['/', '/login', '/register', '/launch']
  const isAuthRoute = $derived(AUTH_ROUTES.some((p) => $location === p))

  // Derive active server/channel from URL
  const activeServerID = $derived($location.startsWith('/server/') ? $location.split('/')[2] ?? '' : '')
  const activeChannelID = $derived($location.startsWith('/server/') ? $location.split('/')[3] ?? '' : '')

  // Derive server list and channel list from atoms
  const serverList = $derived(Object.values($servers))
  const activeChannels = $derived(activeServerID ? ($channels[activeServerID] ?? []) : [])
  const activeServerName = $derived($servers[activeServerID]?.name ?? 'Server')

  // Handle key replaced — server rotated our key; force re-login
  $effect(() => {
    if ($keyReplaced) {
      push('/login')
    }
  })

  // Wire desktop notifications and tray unread tracking
  $effect(() => {
    const c = $client
    const u = $user
    if (!c || !u) return
    const unNotify = setupNotifications(c, u.userID)
    const unTray = setupTray(c, u.userID)
    return () => { unNotify(); unTray() }
  })

  // Register vex:// deep-link handler
  $effect(() => {
    let unsub: (() => void) | undefined
    setupDeepLinks().then((fn) => { unsub = fn })
    return () => { unsub?.() }
  })

  // When navigating to a server without a channel, redirect to the first channel
  $effect(() => {
    if (activeServerID && !activeChannelID) {
      const first = activeChannels[0]
      if (first) {
        push(`/server/${activeServerID}/${first.channelID}`)
      }
    }
  })
</script>

<div class="app">
  <div class="app__body">
    {#if !isAuthRoute}
      <div class="app__sidebar">
        <ServerBar {serverList} activeServerID={activeServerID} channelMap={$channels} />

        {#if activeServerID}
          <ChannelBar serverID={activeServerID} serverName={activeServerName} channels={activeChannels} activeChannelID={activeChannelID} />
        {/if}
      </div>
    {/if}

    <div class="app__content">
      <Router {routes} />
    </div>

    {#if !isAuthRoute}
      {#if activeServerID}
        <MembersPanel serverID={activeServerID} channelID={activeChannelID} />
      {:else}
        <FamiliarsList />
      {/if}
    {/if}
  </div>

  {#if !isAuthRoute}
    <UserMenu username={$user?.username ?? ''} userID={$user?.userID ?? ''} />
  {/if}
</div>

<style>
  .app {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    overflow: hidden;
  }

  .app__body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .app__sidebar {
    display: flex;
    flex-shrink: 0;
  }

  .app__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

</style>
