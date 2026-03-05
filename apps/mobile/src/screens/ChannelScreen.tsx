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
import { $groupMessages, $client, $user } from '../store'

export function ChannelScreen({ route }: { route: any }) {
  const { channelID, channelName } = route.params as { channelID: string; channelName: string }
  const allGroupMessages = useStore($groupMessages)
  const messages: DecryptedMail[] = allGroupMessages[channelID] ?? []
  const client = useStore($client)
  const user = useStore($user)

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const sendMessage = useCallback(async () => {
    const content = text.trim()
    if (!content || !client || !user) return
    setSending(true)
    setText('')
    try {
      await client.sendMail(content, user.userID, user.userID, { group: channelID })
    } catch {
      // TODO: show error
    }
    setSending(false)
  }, [text, client, user, channelID])

  function renderMessage({ item }: { item: DecryptedMail }) {
    const isOwn = item.authorID === user?.userID
    return (
      <View style={styles.message}>
        <Text style={[styles.author, isOwn && styles.authorSelf]}>
          {isOwn ? 'You' : item.authorID.slice(0, 8)}
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
      <FlatList
        data={messages}
        keyExtractor={(m) => m.mailID}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.list}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={`Message #${channelName}`}
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
  message: { marginBottom: 8 },
  author: { color: '#a0a0a0', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  authorSelf: { color: '#cc2a2a' },
  content: { color: '#e8e8e8', fontSize: 14, lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1, borderTopColor: '#2a2a2a', backgroundColor: '#141414' },
  input: { flex: 1, backgroundColor: '#242424', color: '#e8e8e8', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#2a2a2a' },
  sendBtn: { backgroundColor: '#cc2a2a', borderRadius: 4, paddingHorizontal: 16, paddingVertical: 10, marginLeft: 8 },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
