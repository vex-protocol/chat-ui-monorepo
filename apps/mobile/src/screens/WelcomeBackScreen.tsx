import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { decodeHex } from '@vex-chat/crypto'
import { bootstrap } from '../store'
import { loadCredentials, clearCredentials } from '../lib/keychain'
import { getServerUrl } from '../lib/config'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { BackButton } from '../components/BackButton'
import { VexButton } from '../components/VexButton'
import { CornerBracketBox } from '../components/CornerBracketBox'

type Props = NativeStackScreenProps<any, 'WelcomeBack'>

interface SavedCreds {
  username: string
  deviceID: string
  deviceKey: string
  preKey: string
}

export function WelcomeBackScreen({ navigation }: Props) {
  const [creds, setCreds] = useState<SavedCreds | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCredentials().then((c) => setCreds(c))
  }, [])

  async function handleContinue() {
    if (!creds) {
      setError('No saved credentials found.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const SERVER_URL = getServerUrl()

      // Auth with username — for now uses password-less flow via stored device key
      // If the server requires password, this should navigate to a password entry
      const deviceKey = decodeHex(creds.deviceKey)
      const preKeySecret = decodeHex(creds.preKey)

      navigation.navigate('HangTight')
      await bootstrap(SERVER_URL, creds.deviceID, deviceKey, undefined, preKeySecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
      setLoading(false)
    }
  }

  async function handleSwitchAccount() {
    await clearCredentials()
    navigation.navigate('Welcome')
  }

  return (
    <ScreenLayout>
      <BackButton />

      <View style={styles.content}>
        <Text style={styles.heading}>Welcome back.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {creds ? (
          <CornerBracketBox size={10} color={colors.border}>
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {creds.username?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.handle}>@{creds.username}</Text>
                <Text style={styles.deviceId}>
                  Device: {creds.deviceID.slice(0, 12)}...
                </Text>
              </View>
            </View>
          </CornerBracketBox>
        ) : (
          <Text style={styles.noCredsText}>No saved account found.</Text>
        )}

        <VexButton
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={!creds}
          glow
        />

        <View style={styles.links}>
          <Text style={styles.link} onPress={handleSwitchAccount}>
            Not you? Sign in with a different account
          </Text>
          <Text
            style={styles.link}
            onPress={() => navigation.navigate('Initialize')}
          >
            New here? Create an account
          </Text>
        </View>
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    marginTop: 32,
    gap: 24,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
  },
  errorBox: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderColor: colors.error,
    borderWidth: 1,
    padding: 10,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.headingSmall,
    color: colors.text,
    fontSize: 20,
  },
  userInfo: {
    gap: 4,
  },
  handle: {
    ...typography.button,
    color: colors.text,
    fontSize: 16,
  },
  deviceId: {
    ...typography.body,
    color: colors.muted,
  },
  noCredsText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 32,
  },
  links: {
    alignItems: 'center',
    gap: 16,
  },
  link: {
    ...typography.body,
    color: colors.muted,
  },
})
