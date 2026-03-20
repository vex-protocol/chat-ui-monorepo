import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@nanostores/react'
import type { DecryptedMail } from '@vex-chat/types'
import { $groupMessages, $client, $user } from '../store'
import { loadCredentials } from '../lib/keychain'
import { saveGroupMessages } from '../lib/messages'
import { colors } from '../theme'
import { ChatHeader } from '../components/ChatHeader'
import { MessageBubbleRN } from '../components/MessageBubbleRN'
import { MessageInputBar } from '../components/MessageInputBar'

export function ChannelScreen({ route, navigation }: { route: any; navigation: any }) {
  const { channelID, channelName, serverID } = route.params as {
    channelID: string
    channelName: string
    serverID: string
  }
  const allGroupMessages = useStore($groupMessages)
  const client = useStore($client)
  const user = useStore($user)

  // Store keeps messages oldest-first; inverted FlatList needs newest-first
  const messages = useMemo(() => {
    const thread = allGroupMessages[channelID] ?? []
    return [...thread].reverse()
  }, [allGroupMessages, channelID])

  const insets = useSafeAreaInsets()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [usernames, setUsernames] = useState<Record<string, string>>({})

  // Load channel members to resolve userIDs → usernames
  useEffect(() => {
    if (!client) return
    client.listMembers(channelID).then(members => {
      const map: Record<string, string> = {}
      for (const m of members) map[m.userID] = m.username
      setUsernames(map)
    }).catch(() => {})
  }, [client, channelID])

  const sendMessage = useCallback(async () => {
    const content = text.trim()
    if (!content || !client || !user) return
    setSending(true)
    setSendError('')
    setText('')
    try {
      const creds = await loadCredentials()

      // Get all channel members and their devices
      const members = await client.listMembers(channelID)
      const deviceTargets: { deviceID: string; userID: string }[] = []
      for (const member of members) {
        const devices = await client.listDevices(member.userID)
        for (const d of devices) {
          // Skip sender's own current device
          if (member.userID === user.userID && creds && d.deviceID === creds.deviceID) continue
          deviceTargets.push({ deviceID: d.deviceID, userID: member.userID })
        }
      }

      if (deviceTargets.length === 0) {
        setSendError('No devices to send to.')
        setSending(false)
        return
      }

      const sendOpts = { group: channelID }
      const results = await Promise.allSettled(
        deviceTargets.map(t => client.sendMail(content, t.deviceID, t.userID, sendOpts)),
      )
      const anyOk = results.some(r => r.status === 'fulfilled' && r.value.ok)
      if (!anyOk) {
        setSendError('Failed to send message')
        setSending(false)
        return
      }

      // Show sent message locally
      const sentMail: DecryptedMail = {
        mailID: `local-${Date.now()}`,
        authorID: user.userID,
        readerID: user.userID,
        group: channelID,
        mailType: 'text',
        time: new Date().toISOString(),
        content,
        extra: null,
        forward: null,
      }
      const prev = $groupMessages.get()[channelID] ?? []
      $groupMessages.setKey(channelID, [...prev, sentMail])
      saveGroupMessages($groupMessages.get()).catch(() => {})
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send')
    }
    setSending(false)
  }, [text, client, user, channelID, serverID])

  function renderMessage({ item }: { item: DecryptedMail }) {
    const isOwn = item.authorID === user?.userID
    return (
      <MessageBubbleRN
        message={item}
        isOwn={isOwn}
        authorName={isOwn ? 'You' : (usernames[item.authorID] ?? item.authorID.slice(0, 8))}
      />
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <ChatHeader
        title={`# ${channelName}`}
        onBack={() => navigation.navigate('ChannelList', { serverID })}
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
