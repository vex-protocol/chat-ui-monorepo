import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useStore } from '@nanostores/react'
import { $client, $servers, $channels } from '../store'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { BackButton } from '../components/BackButton'
import { VexButton } from '../components/VexButton'
import { CornerBracketBox } from '../components/CornerBracketBox'
import { parseInviteID } from '@vex-chat/libvex'

export function JoinGroupScreen() {
  const navigation = useNavigation()
  const client = useStore($client)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    const inviteID = parseInviteID(input)
    if (!inviteID) {
      setError('Please enter a valid invite link or code')
      return
    }
    if (!client) {
      setError('Not connected')
      return
    }

    setLoading(true)
    setError('')

    try {
      const server = await client.joinServerViaInvite(inviteID)
      $servers.setKey(server.serverID, server)
      const channels = await client.listChannels(server.serverID)
      $channels.setKey(server.serverID, channels)
      // Navigate back — AppTabs will re-render with the new server
      if (navigation.canGoBack()) navigation.goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join server')
      setLoading(false)
    }
  }

  return (
    <ScreenLayout>
      <BackButton />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.heading}>Join a group.</Text>
          <Text style={styles.subtitle}>Enter an invite link or code</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>INVITE CODE</Text>
          <CornerBracketBox size={8} color={colors.border}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={(t) => { setInput(t); setError('') }}
              placeholder="Paste invite link or code"
              placeholderTextColor={colors.mutedDark}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </CornerBracketBox>
        </View>

        <View style={styles.buttonRow}>
          <VexButton
            title="Join"
            onPress={handleJoin}
            loading={loading}
            disabled={!input.trim()}
            glow
          />
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
  field: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  input: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  buttonRow: {
    alignItems: 'center',
  },
})
