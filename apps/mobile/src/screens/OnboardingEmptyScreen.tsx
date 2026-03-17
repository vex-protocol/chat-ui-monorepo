import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { CornerBracketBox } from '../components/CornerBracketBox'

const vexLogo = require('../assets/images/vex-logo.png')

interface ActionCardProps {
  label: string
  title: string
  onPress: () => void
}

function ActionCard({ label, title, onPress }: ActionCardProps) {
  return (
    <CornerBracketBox size={8} color={colors.border}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionCard}>
        <View style={styles.actionBadge}>
          <Text style={styles.actionBadgeText}>{label}</Text>
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
      </TouchableOpacity>
    </CornerBracketBox>
  )
}

export function OnboardingEmptyScreen() {
  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.hamburger}>☰</Text>
        <Image source={vexLogo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.userIcon}>●</Text>
      </View>

      {/* Empty state */}
      <View style={styles.center}>
        <View style={styles.diamond}>
          <Text style={styles.diamondIcon}>💬</Text>
        </View>
        <Text style={styles.heading}>It's quiet here.</Text>
        <Text style={styles.subtitle}>
          Your inbox is empty. Start a conversation or join a group to get going.
        </Text>
      </View>

      {/* Action cards */}
      <View style={styles.actions}>
        <ActionCard label="ADD" title="Add friends" onPress={() => {}} />
        <ActionCard label="CREATE" title="Create group" onPress={() => {}} />
        <ActionCard label="JOIN" title="Join group" onPress={() => {}} />
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  hamburger: {
    fontSize: 24,
    color: colors.text,
  },
  logo: {
    width: 80,
    height: 28,
  },
  userIcon: {
    fontSize: 24,
    color: colors.muted,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  diamond: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  diamondIcon: {
    fontSize: 28,
    transform: [{ rotate: '-45deg' }],
  },
  heading: {
    ...typography.headingSmall,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  actions: {
    gap: 10,
    paddingBottom: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    gap: 12,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  actionBadgeText: {
    ...typography.label,
    color: colors.accent,
    fontSize: 10,
  },
  actionTitle: {
    ...typography.button,
    color: colors.text,
  },
})
