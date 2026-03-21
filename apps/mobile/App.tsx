import 'fast-text-encoding'
import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { useStore } from '@nanostores/react'
import { autoLogin, $keyReplaced, $user, $client, $familiars, $messages, $groupMessages, mobilePersistence } from './src/store'
import { keychainKeyStore } from './src/lib/keychain'
import { clearCredentials } from './src/lib/keychain'
import { getServerUrl } from './src/lib/config'
import { loadFamiliars, saveFamiliars, saveDmMessages, saveGroupMessages } from './src/lib/messages'
import { RootNavigator } from './src/navigation/RootNavigator'
import { navigationRef } from './src/navigation/navigationRef'
import { requestNotificationPermission, showMessageNotification, setupNotificationHandlers } from './src/lib/notifications'
import { colors, fontFamilies } from './src/theme'

function App() {
  const keyReplaced = useStore($keyReplaced)
  const user = useStore($user)
  const client = useStore($client)

  useEffect(() => {
    const unsubNotif = setupNotificationHandlers()
    return () => { unsubNotif() }
  }, [])

  useEffect(() => {
    ;(async () => {
      await requestNotificationPermission()
      await autoLogin(keychainKeyStore, getServerUrl(), mobilePersistence)

      // Load persisted familiars AFTER bootstrap (resetAll clears atoms)
      const saved = await loadFamiliars()
      for (const [id, u] of Object.entries(saved)) {
        $familiars.setKey(id, u)
      }
    })()
  }, [])

  // Persist familiars whenever they change
  const familiars = useStore($familiars)
  useEffect(() => {
    if (Object.keys(familiars).length > 0) {
      saveFamiliars(familiars).catch(() => {})
    }
  }, [familiars])

  // Persist messages whenever they change
  const allDms = useStore($messages)
  const allGroups = useStore($groupMessages)
  useEffect(() => {
    if (Object.keys(allDms).length > 0) {
      saveDmMessages(allDms).catch(() => {})
    }
  }, [allDms])
  useEffect(() => {
    if (Object.keys(allGroups).length > 0) {
      saveGroupMessages(allGroups).catch(() => {})
    }
  }, [allGroups])

  // Show local notifications for incoming messages when app is backgrounded
  useEffect(() => {
    if (!client) return
    client.on('mail', showMessageNotification)
    return () => { client.off('mail', showMessageNotification) }
  }, [client])

  useEffect(() => {
    if (keyReplaced) {
      // Key was replaced server-side — clear stored credentials and force re-auth
      clearCredentials()
      // Navigation auto-redirects to Auth via $user becoming null
    }
  }, [keyReplaced])

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: true,
          colors: {
            primary: colors.accentMuted,
            background: colors.bg,
            card: colors.card,
            text: colors.textSecondary,
            border: colors.borderSubtle,
            notification: colors.error,
          },
          fonts: {
            regular: { fontFamily: fontFamilies.mono, fontWeight: '300' },
            medium: { fontFamily: fontFamilies.body, fontWeight: '500' },
            bold: { fontFamily: fontFamilies.heading, fontWeight: '500' },
            heavy: { fontFamily: fontFamilies.heading, fontWeight: '500' },
          },
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default App
