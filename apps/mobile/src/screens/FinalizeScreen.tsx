import React, { useState, useCallback, useRef } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Client } from '@vex-chat/libvex'
import { bootstrap } from '../store'
import { expoPreset } from '@vex-chat/libvex/preset/expo'
import { saveCredentials } from '../lib/keychain'
import { getServerUrl } from '../lib/config'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { BackButton } from '../components/BackButton'
import { VexButton } from '../components/VexButton'
import { CornerBracketBox } from '../components/CornerBracketBox'

type Props = NativeStackScreenProps<any, 'Finalize'>

const AVATAR_PRESETS = ['🟥', '🔷', '🟢', '🟡', '🟣'] as const

export function FinalizeScreen({ navigation, route }: Props) {
  const method = (route.params as any)?.method ?? 'username'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkAvailability = useCallback((name: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!name || name.length < 3) {
      setAvailable(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        // TODO: Client.checkUsername() was removed from the public API.
        // For now, skip client-side availability checks; the server will
        // reject duplicate usernames during registration.
        setAvailable(null)
      } catch {
        setAvailable(null)
      }
    }, 400)
  }, [])

  const handleUsernameChange = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 19)
    setUsername(cleaned)
    checkAvailability(cleaned)
  }

  async function handleComplete() {
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      const SERVER_URL = getServerUrl()

      const privateKey = Client.generateSecretKey()
      const client = await Client.create(privateKey, { host: SERVER_URL, unsafeHttp: SERVER_URL.startsWith('http:') })
      const [user, regErr] = await client.register(username, password)

      if (regErr || !user) {
        setError(regErr?.message || 'Registration failed')
        setLoading(false)
        return
      }

      await saveCredentials({
        username,
        deviceID: client.me.device().deviceID,
        deviceKey: privateKey,
      })

      navigation.navigate('HangTight')

      await bootstrap(privateKey, expoPreset(), { host: SERVER_URL, unsafeHttp: SERVER_URL.startsWith('http:') })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setLoading(false)
    }
  }

  return (
    <ScreenLayout>
      <BackButton />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.methodBadge}>
          <Text style={styles.methodText}>AUTHENTICATED VIA: {method.toUpperCase()}</Text>
        </View>

        <Text style={styles.heading}>Finalize.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Username input */}
        <View style={styles.field}>
          <Text style={styles.label}>HANDLE</Text>
          <View style={styles.inputRow}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="username"
              placeholderTextColor={colors.mutedDark}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={19}
              editable={!loading}
            />
            {available !== null && (
              <Text style={[styles.avail, available ? styles.availOk : styles.availNo]}>
                {available ? '✓' : '✗'}
              </Text>
            )}
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={[styles.input, styles.inputFull]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedDark}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <TextInput
            style={[styles.input, styles.inputFull]}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedDark}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Avatar grid */}
        <View style={styles.field}>
          <Text style={styles.label}>AVATAR</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_PRESETS.map((emoji, i) => (
              <TouchableOpacity key={i} onPress={() => setSelectedAvatar(i)}>
                <CornerBracketBox
                  size={6}
                  color={selectedAvatar === i ? colors.accent : colors.border}
                >
                  <View style={[styles.avatarCell, selectedAvatar === i && styles.avatarSelected]}>
                    <Text style={styles.avatarEmoji}>{emoji}</Text>
                  </View>
                </CornerBracketBox>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => {}}>
              <CornerBracketBox size={6} color={colors.border}>
                <View style={styles.avatarCell}>
                  <Text style={styles.avatarPlus}>+</Text>
                </View>
              </CornerBracketBox>
            </TouchableOpacity>
          </View>
        </View>

        <VexButton
          title="Complete Setup"
          onPress={handleComplete}
          loading={loading}
          disabled={!username || !password || !confirm}
          glow
          style={styles.completeBtn}
        />
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    marginTop: 24,
  },
  methodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodText: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    marginTop: 12,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderColor: colors.error,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  field: {
    gap: 6,
    marginBottom: 16,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
  },
  atSign: {
    ...typography.bodyLarge,
    color: colors.muted,
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 12,
  },
  inputFull: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
  },
  avail: {
    fontSize: 16,
    marginLeft: 8,
  },
  availOk: {
    color: '#22c55e',
  },
  availNo: {
    color: colors.error,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarCell: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  avatarSelected: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  avatarPlus: {
    fontSize: 24,
    color: colors.muted,
  },
  completeBtn: {
    marginTop: 8,
    marginBottom: 32,
  },
})
