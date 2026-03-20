import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, typography } from '../theme'

interface ChatHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
}

export function ChatHeader({ title, subtitle, onBack }: ChatHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.breadcrumb}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <>
            <Text style={styles.separator}>|</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>🔍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.bg,
  },
  breadcrumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginRight: 4,
  },
  backArrow: {
    color: colors.text,
    fontSize: 18,
  },
  title: {
    ...typography.button,
    color: colors.text,
    fontSize: 16,
  },
  separator: {
    color: colors.muted,
    fontSize: 14,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
})
