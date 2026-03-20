import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { colors, typography } from '../theme'
import { ScreenLayout } from '../components/ScreenLayout'
import { BackButton } from '../components/BackButton'
import { VexButton } from '../components/VexButton'
import { CornerBracketBox } from '../components/CornerBracketBox'

type Props = NativeStackScreenProps<any, 'Authenticate'>

const CODE_LENGTH = 6
const EXPIRY_SECONDS = 5 * 60

export function AuthenticateScreen({ navigation }: Props) {
  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (secondsLeft % 60).toString().padStart(2, '0')

  const handleConfirm = () => {
    // TODO: verify code with server
  }

  return (
    <ScreenLayout>
      <BackButton />

      <View style={styles.content}>
        <Text style={styles.label}>VERIFICATION REQUIRED</Text>
        <Text style={styles.heading}>Authenticate.</Text>

        {/* Code cells */}
        <View style={styles.codeRow}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const filled = i < code.length
            return (
              <CornerBracketBox
                key={i}
                size={6}
                color={filled ? colors.accent : colors.border}
              >
                <View
                  style={[styles.cell, filled && styles.cellFilled]}
                >
                  <Text style={styles.cellText}>
                    {code[i] ?? ''}
                  </Text>
                </View>
              </CornerBracketBox>
            )
          })}
        </View>

        {/* Hidden input */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={(t) => setCode(t.slice(0, CODE_LENGTH))}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
        />

        <Text style={styles.timer}>Expires in: {minutes}:{seconds}</Text>

        <VexButton
          title="Confirm Identity"
          onPress={handleConfirm}
          disabled={code.length < CODE_LENGTH}
        />

        <View style={styles.links}>
          <Text style={styles.link}>Resend verification code</Text>
          <Text style={styles.link}>Try another way</Text>
        </View>
      </View>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    marginTop: 32,
    gap: 20,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 16,
  },
  cell: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellFilled: {
    borderColor: colors.accent,
  },
  cellText: {
    ...typography.headingSmall,
    color: colors.text,
    fontSize: 24,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
  },
  timer: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  links: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  link: {
    ...typography.body,
    color: colors.muted,
  },
})
