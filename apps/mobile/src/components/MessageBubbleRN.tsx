import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { DecryptedMail } from '@vex-chat/types'
import { formatTime, avatarHue } from '@vex-chat/store'
import { colors, typography } from '../theme'

interface MessageBubbleRNProps {
  message: DecryptedMail
  isOwn: boolean
  authorName: string
}

export function MessageBubbleRN({ message, isOwn, authorName }: MessageBubbleRNProps) {
  if (message.mailType === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: `hsl(${avatarHue(message.authorID)}, 45%, 40%)` }]}>
        <Text style={styles.avatarText}>
          {authorName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.meta}>
          <Text style={[styles.author, isOwn && styles.authorSelf]}>
            {authorName}
          </Text>
          <Text style={styles.timestamp}>{formatTime(message.time)}</Text>
        </View>
        <Text style={styles.text}>{message.content}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  author: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  authorSelf: {
    color: colors.accentMuted,
  },
  timestamp: {
    ...typography.body,
    color: colors.muted,
    fontSize: 10,
  },
  text: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  systemContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  systemText: {
    ...typography.body,
    color: colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
})
