import React from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { colors, typography } from '../theme'

interface MessageInputBarProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  placeholder?: string
  sending?: boolean
}

export function MessageInputBar({
  value,
  onChangeText,
  onSend,
  placeholder = 'Message...',
  sending = false,
}: MessageInputBarProps) {
  const canSend = value.trim().length > 0 && !sending

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionBtn}>
        <Text style={styles.actionIcon}>+</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedDark}
        multiline
        editable={!sending}
      />

      <TouchableOpacity
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Text style={styles.sendText}>→</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    color: colors.muted,
    fontSize: 18,
  },
  input: {
    flex: 1,
    backgroundColor: colors.input,
    color: colors.textSecondary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
