// Re-export all atoms without the $ prefix so Svelte's reactive $ syntax works cleanly.
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

export { registerAndBootstrap, loginAndBootstrap, autoLogin, resetAll, markVerified, unmarkVerified, isVerified } from '@vex-chat/store'
export { $verifiedKeys as verifiedKeys } from '@vex-chat/store'
