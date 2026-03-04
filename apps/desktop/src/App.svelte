<script lang="ts">
  import Router, { location } from 'svelte-spa-router'
  import TitleBar from './lib/TitleBar.svelte'
  import ServerBar from './lib/ServerBar.svelte'
  import ChannelBar from './lib/ChannelBar.svelte'
  import UserMenu from './lib/UserMenu.svelte'

  import Launch from './routes/Launch.svelte'
  import Login from './routes/Login.svelte'
  import Register from './routes/Register.svelte'
  import Messaging from './routes/Messaging.svelte'
  import ServerChannel from './routes/ServerChannel.svelte'

  const routes = {
    '/':                            Launch,
    '/launch':                      Launch,
    '/login':                       Login,
    '/register':                    Register,
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
</script>

<div class="app">
  <TitleBar />

  <div class="app__body">
    {#if !isAuthRoute}
      <div class="app__sidebar">
        <!-- vex-chat-6m0: replace placeholder with $servers atom -->
        <ServerBar activeServerID={activeServerID} />

        {#if activeServerID}
          <!-- vex-chat-6m0: replace with $channels[activeServerID] atom -->
          <ChannelBar serverID={activeServerID} serverName="Server" activeChannelID={activeChannelID} />
        {/if}
      </div>
    {/if}

    <div class="app__content">
      <Router {routes} />
    </div>

    {#if !isAuthRoute}
      <!-- vex-chat-xv9: DM / familiars list -->
      <aside class="app__familiars" aria-label="Direct messages"></aside>
    {/if}
  </div>

  {#if !isAuthRoute}
    <!-- vex-chat-6m0: replace with $user atom -->
    <UserMenu />
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

  .app__familiars {
    width: 220px;
    flex-shrink: 0;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
  }
</style>
