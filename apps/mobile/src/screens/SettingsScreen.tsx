import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  text: { color: '#e8e8e8', fontSize: 18 },
})
