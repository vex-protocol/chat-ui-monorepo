import React, { useState, useCallback } from 'react'
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useStore } from '@nanostores/react'
import type { DecryptedMail } from '@vex-chat/types'
import { $groupMessages, $client, $user } from '../store'
import { colors } from '../theme'
import { ChatHeader } from '../components/ChatHeader'
import { MessageBubbleRN } from '../components/MessageBubbleRN'
import { MessageInputBar } from '../components/MessageInputBar'

export function ChannelScreen({ route, navigation }: { route: any; navigation: any }) {
  const { channelID, channelName, serverName } = route.params as {
    channelID: string
    channelName: string
    serverName?: string
  }
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
      <MessageBubbleRN
        message={item}
        isOwn={isOwn}
        authorName={isOwn ? 'You' : item.authorID.slice(0, 8)}
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
        title={serverName ?? 'Server'}
        subtitle={`#${channelName}`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={messages}
        keyExtractor={(m) => m.mailID}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.list}
      />

      <MessageInputBar
        value={text}
        onChangeText={setText}
        onSend={sendMessage}
        placeholder={`Message #${channelName}`}
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
})
