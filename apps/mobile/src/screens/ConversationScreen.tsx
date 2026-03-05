import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useStore } from '@nanostores/react'
import type { DecryptedMail } from '@vex-chat/types'
import { $messages, $client, $user } from '../store'

export function ConversationScreen({ route }: { route: any }) {
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
      <View style={styles.message}>
        <Text style={[styles.author, isOwn && styles.authorSelf]}>
          {isOwn ? 'You' : username}
        </Text>
        <Text style={styles.content}>{item.content}</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
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

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={`Message @${username}`}
          placeholderTextColor="#666666"
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  list: { padding: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666666', fontSize: 14, fontStyle: 'italic' },
  emptyHint: { color: '#555555', fontSize: 12, marginTop: 4 },
  message: { marginBottom: 8 },
  author: { color: '#a0a0a0', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  authorSelf: { color: '#cc2a2a' },
  content: { color: '#e8e8e8', fontSize: 14, lineHeight: 20 },
  errorBar: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(229, 57, 53, 0.15)' },
  errorText: { color: '#e53935', fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1, borderTopColor: '#2a2a2a', backgroundColor: '#141414' },
  input: { flex: 1, backgroundColor: '#242424', color: '#e8e8e8', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#2a2a2a' },
  sendBtn: { backgroundColor: '#cc2a2a', borderRadius: 4, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
