import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, typography } from '../theme'

interface SectionDividerProps {
  label?: string
}

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.lineSection}>
        <Text style={styles.plus}>+</Text>
        <View style={styles.line} />
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.lineSection}>
        <View style={styles.line} />
        <Text style={styles.plus}>+</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  lineSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  plus: {
    ...typography.label,
    color: colors.muted,
    fontSize: 10,
  },
  label: {
    ...typography.label,
    color: colors.muted,
  },
})
