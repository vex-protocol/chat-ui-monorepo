import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native'
import { useStore } from '@nanostores/react'
import notifee, { AndroidImportance } from '@notifee/react-native'
import { $user, $client } from '../store'
import { resetAll } from '@vex-chat/store'
import { clearCredentials } from '../lib/keychain'
import { clearMessages } from '../lib/messages'

export function SettingsScreen({ navigation }: { navigation: any }) {
  const user = useStore($user)
  const client = useStore($client)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await client?.logout()
    } catch { /* ignore */ }
    await clearCredentials()
    await clearMessages()
    resetAll()
  }

  function handleClearKeys() {
    Alert.alert(
      'Clear device keys',
      'This will permanently delete your device key from this device. You will need to re-register.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear keys',
          style: 'destructive',
          onPress: async () => {
            try {
              await client?.logout()
            } catch { /* ignore */ }
            await clearCredentials()
            await clearMessages()
            resetAll()
          },
        },
      ],
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user?.username ?? '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={[styles.value, styles.mono]}>{user?.userID?.slice(0, 16) ?? '—'}…</Text>
        </View>
      </View>

      {/* App info section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>0.1.0</Text>
        </View>

        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowInfo}>
            <Text style={styles.label}>Notifications</Text>
            <Text style={styles.desc}>Send a test notification</Text>
          </View>
          <TouchableOpacity style={styles.testBtn} onPress={async () => {
            await notifee.createChannel({ id: 'vex-messages', name: 'Messages', importance: AndroidImportance.HIGH, sound: 'default' })
            await notifee.displayNotification({
              title: 'Test User',
              body: 'This is a test notification from Vex.',
              data: { authorID: 'test', username: 'Test User' },
              android: { channelId: 'vex-messages', pressAction: { id: 'default' }, sound: 'default' },
              ios: { sound: 'default' },
            })
          }}>
            <Text style={styles.testBtnText}>Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.label}>Sign out</Text>
            <Text style={styles.desc}>Disconnect and return to the login screen</Text>
          </View>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Text style={styles.dangerBtnText}>{loggingOut ? 'Signing out…' : 'Sign out'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowInfo}>
            <Text style={styles.label}>Clear device keys</Text>
            <Text style={styles.desc}>Delete keys and re-register</Text>
          </View>
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearKeys}>
            <Text style={styles.dangerBtnText}>Clear keys</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { padding: 16, gap: 16 },
  section: {
    backgroundColor: '#141414',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  dangerSection: {
    borderColor: 'rgba(229, 57, 53, 0.4)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#666666',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e8e8e8',
  },
  desc: {
    fontSize: 12,
    color: '#666666',
  },
  value: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: 12,
  },
  dangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.5)',
  },
  dangerBtnText: {
    color: '#e53935',
    fontSize: 13,
    fontWeight: '600',
  },
  testBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  testBtnText: {
    color: '#a0a0a0',
    fontSize: 13,
    fontWeight: '600',
  },
})
