// Re-export all atoms without the $ prefix so Svelte's reactive $ syntax works cleanly.
// Usage: import { user, messages } from '$lib/store'
//        In template: {$user?.username}  {#each $messages[id] ?? [] as mail}

export {
  $messages as messages,
  $groupMessages as groupMessages,
  $user as user,
  $servers as servers,
  $channels as channels,
  $permissions as permissions,
  $devices as devices,
  $familiars as familiars,
  $onlineLists as onlineLists,
  $client as client,
  $keyReplaced as keyReplaced,
  $avatarHash as avatarHash,
} from '@vex-chat/store'

export { bootstrap } from '@vex-chat/store'
