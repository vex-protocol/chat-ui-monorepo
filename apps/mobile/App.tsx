import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { useStore } from '@nanostores/react'
import { decodeHex } from '@vex-chat/crypto'
import { bootstrap, $keyReplaced, $user, $client } from './src/store'
import { loadCredentials, clearCredentials } from './src/lib/keychain'
import { getServerUrl } from './src/lib/config'
import { RootNavigator } from './src/navigation/RootNavigator'
import { navigationRef } from './src/navigation/navigationRef'
import { requestNotificationPermission, showMessageNotification, setupNotificationHandlers } from './src/lib/notifications'

function App() {
  const keyReplaced = useStore($keyReplaced)
  const user = useStore($user)
  const client = useStore($client)

  useEffect(() => {
    const unsubNotif = setupNotificationHandlers()
    return () => { unsubNotif() }
  }, [])

  useEffect(() => {
    // Auto-login: try loading credentials from keychain on mount
    ;(async () => {
      await requestNotificationPermission()

      const creds = await loadCredentials()
      if (!creds) return

      try {
        const deviceKey = decodeHex(creds.deviceKey)
        const preKeySecret = decodeHex(creds.preKey)

        // Attempt bootstrap with saved credentials (no JWT — will rely on session)
        await bootstrap(getServerUrl(), creds.deviceID, deviceKey, undefined, preKeySecret)
      } catch {
        // Credentials invalid or session expired — user will see login screen
      }
    })()
  }, [])

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
            primary: '#cc2a2a',
            background: '#1a1a1a',
            card: '#141414',
            text: '#e8e8e8',
            border: '#2a2a2a',
            notification: '#e53935',
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '900' },
          },
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

export default App
