import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { parse as uuidParse } from 'uuid'
import { generateSignKeyPair, signMessage, encodeHex } from '@vex-chat/crypto'
import { bootstrap } from '../store'
import { saveCredentials } from '../lib/keychain'
import { getServerUrl } from '../lib/config'

export function RegisterScreen({ navigation }: { navigation: any }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    try {
      const SERVER_URL = getServerUrl()

      // Generate Ed25519 device signing key pair + preKey pair
      const signKeyPair = generateSignKeyPair()
      const preKeyPair = generateSignKeyPair()

      // Fetch open registration token
      const tokenRes = await fetch(`${SERVER_URL}/token/open/register`)
      if (!tokenRes.ok) {
        setError(
          tokenRes.status === 404
            ? 'Registration is invite-only on this server.'
            : `Failed to get registration token (${tokenRes.status})`,
        )
        setLoading(false)
        return
      }
      const { key: tokenKey } = (await tokenRes.json()) as { key: string }

      // Sign the token UUID bytes with the device signing key
      const tokenBytes = uuidParse(tokenKey) as Uint8Array
      const signed = signMessage(tokenBytes, signKeyPair.secretKey)

      // Sign the preKey public key with the signing key
      const preKeySignature = signMessage(preKeyPair.publicKey, signKeyPair.secretKey)

      // POST /register
      const regRes = await fetch(`${SERVER_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          signKey: encodeHex(signKeyPair.publicKey),
          signed: encodeHex(signed),
          preKey: encodeHex(preKeyPair.publicKey),
          preKeySignature: encodeHex(preKeySignature),
          preKeyIndex: 0,
          deviceName: 'Mobile',
        }),
      })

      if (!regRes.ok) {
        const body = (await regRes.json().catch(() => ({}))) as { message?: string }
        setError(body.message ?? `Registration failed (${regRes.status})`)
        setLoading(false)
        return
      }

      const regData = (await regRes.json()) as { token: string; userID: string; deviceID: string }

      // Save device credentials to OS keychain
      await saveCredentials({
        username,
        deviceID: regData.deviceID,
        deviceKey: encodeHex(signKeyPair.secretKey),
        preKey: encodeHex(preKeyPair.secretKey),
      })

      // Bootstrap the store with the JWT from registration response
      await bootstrap(SERVER_URL, regData.deviceID, signKeyPair.secretKey, regData.token, preKeyPair.secretKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Vex Chat</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="choose a username"
              placeholderTextColor="#666666"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={19}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#666666"
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor="#666666"
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading || !username || !password || !confirm}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1a1a1a' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: '#141414', borderColor: '#2a2a2a', borderWidth: 1, borderRadius: 8, padding: 32, width: 340, gap: 16 },
  title: { color: '#e8e8e8', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#a0a0a0', fontSize: 13, marginTop: -8 },
  errorBox: { backgroundColor: 'rgba(229, 57, 53, 0.15)', borderColor: '#e53935', borderWidth: 1, borderRadius: 4, padding: 10 },
  errorText: { color: '#e53935', fontSize: 13 },
  field: { gap: 5 },
  label: { color: '#a0a0a0', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  input: { backgroundColor: '#242424', color: '#e8e8e8', borderColor: '#2a2a2a', borderWidth: 1, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
  button: { backgroundColor: '#cc2a2a', borderRadius: 4, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#a0a0a0', fontSize: 13 },
  link: { color: '#cc2a2a', fontSize: 13, textDecorationLine: 'underline' },
})
