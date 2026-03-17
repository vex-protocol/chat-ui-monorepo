import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useStore } from '@nanostores/react'
import type { DecryptedMail } from '@vex-chat/types'
import { $messages, $client, $user } from '../store'
import { colors, typography } from '../theme'
import { ChatHeader } from '../components/ChatHeader'
import { MessageBubbleRN } from '../components/MessageBubbleRN'
import { MessageInputBar } from '../components/MessageInputBar'

export function ConversationScreen({ route, navigation }: { route: any; navigation: any }) {
  const { userID, username } = route.params as { userID: string; username: string }
  const allMessages = useStore($messages)
  const messages: DecryptedMail[] = allMessages[userID] ?? []
  const client = useStore($client)
  const user = useStore($user)

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const sendMessage = useCallback(async () => {
    const content = text.trim()
    if (!content || !client || !user) return
    setSending(true)
    setText('')
    setError('')
    try {
      const devices = await client.listDevices(userID)
      const device = devices[0]
      if (!device) {
        setError('Recipient has no registered devices.')
        setSending(false)
        return
      }
      const result = await client.sendMail(content, device.deviceID, userID)
      if (!result.ok) {
        setError(result.error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    }
    setSending(false)
  }, [text, client, user, userID])

  function renderMessage({ item }: { item: DecryptedMail }) {
    const isOwn = item.authorID === user?.userID
    return (
      <MessageBubbleRN
        message={item}
        isOwn={isOwn}
        authorName={isOwn ? 'You' : username}
      />
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ChatHeader
        title="Home"
        subtitle={`@${username}`}
        onBack={() => navigation.goBack()}
      />

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No messages yet.</Text>
          <Text style={styles.emptyHint}>Say hello to {username}!</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.mailID}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.list}
        />
      )}

      {error !== '' && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <MessageInputBar
        value={text}
        onChangeText={setText}
        onSend={sendMessage}
        placeholder={`Message @${username}`}
        sending={sending}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  list: {
    paddingVertical: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.mutedDark,
    fontStyle: 'italic',
  },
  emptyHint: {
    ...typography.body,
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  errorBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
})
