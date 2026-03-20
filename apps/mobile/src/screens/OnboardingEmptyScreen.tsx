import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path } from 'react-native-svg'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { CornerBracketBox } from '../components/CornerBracketBox'
import { VexLogo } from '../components/VexLogo'

interface ActionCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  badge: string
  accentColor: string
  onPress: () => void
}

function ActionCard({ icon, title, subtitle, badge, accentColor, onPress }: ActionCardProps) {
  return (
    <CornerBracketBox size={8} color={accentColor}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.actionCard}>
        <View style={styles.actionLeft}>
          {icon}
        </View>
        <View style={styles.actionCenter}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.actionBadge, { borderColor: accentColor }]}>
          <Text style={[styles.actionBadgeText, { color: accentColor }]}>{badge}</Text>
        </View>
      </TouchableOpacity>
    </CornerBracketBox>
  )
}

function PersonAddIcon({ color = colors.accent }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={color} />
    </Svg>
  )
}

function GroupIcon({ color = '#4CAF50' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill={color} />
    </Svg>
  )
}

function JoinIcon({ color = '#FFC107' }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill={color} />
    </Svg>
  )
}

function ChatBubbleIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="#FFFFFF" />
      <Path d="M7 9h2v2H7V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9z" fill="#FFFFFF" />
    </Svg>
  )
}

export function OnboardingEmptyScreen() {
  const navigation = useNavigation<any>()

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.hamburger}>☰</Text>
        <VexLogo size={28} />
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={colors.muted} />
        </Svg>
      </View>

      {/* Empty state */}
      <View style={styles.center}>
        <View style={styles.diamondOuter}>
          <View style={styles.diamond}>
            <View style={styles.diamondInner}>
              <ChatBubbleIcon />
            </View>
          </View>
        </View>
        <Text style={styles.heading}>It's quiet here.</Text>
        <Text style={styles.subtitle}>
          Your inbox is completely empty. Connect{'\n'}with people to get things moving.
        </Text>
      </View>

      {/* Action cards */}
      <View style={styles.actions}>
        <ActionCard
          icon={<PersonAddIcon color={colors.accent} />}
          title="Add friends"
          subtitle="Find people you know"
          badge="ADD"
          accentColor={colors.accent}
          onPress={() => {}}
        />
        <ActionCard
          icon={<GroupIcon color="#4CAF50" />}
          title="Create group"
          subtitle="Start a new conversation space"
          badge="CREATE"
          accentColor="#4CAF50"
          onPress={() => {}}
        />
        <ActionCard
          icon={<JoinIcon color="#FFC107" />}
          title="Join group"
          subtitle="Enter an invite code"
          badge="JOIN"
          accentColor="#FFC107"
          onPress={() => navigation.navigate('JoinGroup')}
        />
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  diamondOuter: {
    marginBottom: 24,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  diamond: {
    width: 80,
    height: 80,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  diamondInner: {
    transform: [{ rotate: '-45deg' }],
  },
  heading: {
    ...typography.headingSmall,
    color: colors.text,
    fontSize: 32,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
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
  actionLeft: {
    width: 32,
    alignItems: 'center',
  },
  actionCenter: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    ...typography.button,
    color: colors.text,
  },
  actionSubtitle: {
    ...typography.body,
    color: colors.muted,
    fontSize: 11,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  actionBadgeText: {
    ...typography.label,
    fontSize: 10,
  },
})
