import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useStore } from '@nanostores/react'
import type { IMessage } from '@vex-chat/libvex'
import { $messages, $user } from '../store'
import { sendDirectMessage, markRead } from '@vex-chat/store'
import { setActiveConversation } from '../lib/notifications'
import { keychainKeyStore } from '../lib/keychain'
import { colors, typography } from '../theme'
import { ChatHeader } from '../components/ChatHeader'
import { MessageBubbleRN } from '../components/MessageBubbleRN'
import { MessageInputBar } from '../components/MessageInputBar'

export function ConversationScreen({ route, navigation }: { route: any; navigation: any }) {
  const { userID, username } = route.params as { userID: string; username: string }
  const allMessages = useStore($messages)
  const user = useStore($user)

  // Store keeps messages oldest-first; inverted FlatList needs newest-first
  const messages = useMemo(() => {
    const thread = allMessages[userID] ?? []
    return [...thread].reverse()
  }, [allMessages, userID])

  // Track active conversation for notification suppression + mark read
  useEffect(() => {
    setActiveConversation(userID)
    markRead(userID)
    return () => { setActiveConversation(null) }
  }, [userID])

  // Mark read whenever new messages arrive while viewing
  useEffect(() => {
    if (messages.length > 0) markRead(userID)
  }, [messages.length, userID])

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const sendMessage = useCallback(async () => {
    const content = text.trim()
    if (!content || !user) return
    setSending(true)
    setText('')
    setError('')
    try {
      const result = await sendDirectMessage(userID, content, {
        keyStore: keychainKeyStore,
      })
      if (!result.ok) {
        setError(result.error ?? 'Failed to send')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    }
    setSending(false)
  }, [text, user, userID])

  function renderMessage({ item }: { item: IMessage }) {
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
