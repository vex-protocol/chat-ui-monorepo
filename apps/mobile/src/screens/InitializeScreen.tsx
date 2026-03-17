import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { BackButton } from '../components/BackButton'
import { SectionDivider } from '../components/SectionDivider'
import { AuthMethodCard } from '../components/AuthMethodCard'

type Props = NativeStackScreenProps<any, 'Initialize'>

export function InitializeScreen({ navigation }: Props) {
  const goFinalize = (method: string) =>
    navigation.navigate('Finalize', { method })

  return (
    <ScreenLayout>
      <BackButton />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>AUTHORIZATION METHOD</Text>
        <Text style={styles.heading}>Initialize.</Text>

        <SectionDivider label="EXTERNAL" />

        <View style={styles.cards}>
          <AuthMethodCard
            icon={<Text style={styles.icon}>G</Text>}
            title="Google"
            privacyLevel={1}
            privacyLabel="LOW PRIVACY"
            badge="3RD PARTY"
            onPress={() => goFinalize('google')}
          />
          <AuthMethodCard
            icon={<Text style={styles.icon}></Text>}
            title="Apple"
            privacyLevel={1}
            privacyLabel="LOW PRIVACY"
            badge="3RD PARTY"
            onPress={() => goFinalize('apple')}
          />
        </View>

        <SectionDivider label="INTERNAL" />

        <View style={styles.cards}>
          <AuthMethodCard
            icon={<Text style={styles.icon}>@</Text>}
            title="Email"
            privacyLevel={2}
            privacyLabel="STANDARD"
            onPress={() => goFinalize('email')}
          />
          <AuthMethodCard
            icon={<Text style={styles.icon}>◆</Text>}
            title="Wallet Connect"
            privacyLevel={3}
            privacyLabel="HIGH PRIVACY"
            onPress={() => goFinalize('wallet')}
          />
          <AuthMethodCard
            icon={<Text style={styles.icon}>⊕</Text>}
            title="Username"
            privacyLevel={4}
            privacyLabel="MAX PRIVACY"
            onPress={() => goFinalize('username')}
          />
        </View>

        <Text
          style={styles.footer}
          onPress={() => navigation.navigate('WelcomeBack')}
        >
          Already have an account? Log in
        </Text>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    marginTop: 24,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    marginTop: 8,
  },
  cards: {
    gap: 10,
  },
  icon: {
    fontSize: 18,
    color: colors.text,
  },
  footer: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
})
