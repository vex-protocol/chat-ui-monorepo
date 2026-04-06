import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { autoLogin } from '../store'
import { expoPreset } from '@vex-chat/libvex/preset/expo'
import { loadCredentials, clearCredentials, keychainKeyStore } from '../lib/keychain'
import { getServerOptions } from '../lib/config'
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
  preKey?: string
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
      navigation.navigate('HangTight')

      const result = await autoLogin(keychainKeyStore, expoPreset(), getServerOptions())

      if (!result.ok) {
        if (navigation.canGoBack()) navigation.goBack()
        setError(result.error || 'Failed to sign in')
        setLoading(false)
        return
      }
      // Success — RootNavigator auto-switches to App when $user becomes non-null
    } catch (err) {
      // Navigate back so the user sees the error instead of being stuck on HangTight
      if (navigation.canGoBack()) navigation.goBack()
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Welcome back.</Text>
          <Text style={styles.subtitle}>Continue where you left off</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* User card */}
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
                  {creds.username}@vex.wtf
                </Text>
              </View>
            </View>
          </CornerBracketBox>
        ) : (
          <Text style={styles.noCredsText}>No saved account found.</Text>
        )}

        {/* Continue button */}
        <View style={styles.buttonRow}>
          <VexButton
            title="Continue"
            onPress={handleContinue}
            variant="outline"
            loading={loading}
            disabled={!creds}
            glow
          />
        </View>
      </View>

      {/* Footer links */}
      <View style={styles.footer}>
        <View style={styles.footerSection}>
          <Text style={styles.footerLabel}>Not you?</Text>
          <Text style={styles.footerLink} onPress={handleSwitchAccount}>
            Sign in with a different account
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.footerSection}>
          <Text style={styles.footerLabel}>New here?</Text>
          <Text
            style={styles.footerLink}
            onPress={() => navigation.navigate('Initialize')}
          >
            Create an account
          </Text>
        </View>
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
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
  buttonRow: {
    alignItems: 'center',
  },
  noCredsText: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: 32,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
  },
  footerSection: {
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    ...typography.body,
    color: colors.muted,
  },
  footerLink: {
    ...typography.body,
    color: colors.accent,
  },
  divider: {
    width: 80,
    height: 1,
    backgroundColor: colors.border,
  },
})
