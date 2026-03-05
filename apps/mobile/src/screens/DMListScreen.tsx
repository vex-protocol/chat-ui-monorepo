import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useStore } from '@nanostores/react'
import type { IUser, DecryptedMail } from '@vex-chat/types'
import { $familiars, $messages, $client } from '../store'
import { $familiars as familiarsAtom } from '@vex-chat/store'

export function DMListScreen({ navigation }: { navigation: any }) {
  const familiars = useStore($familiars)
  const allMessages = useStore($messages)
  const client = useStore($client)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IUser[]>([])
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const familiarList = Object.values(familiars)

  const onSearch = useCallback(
    (text: string) => {
      setQuery(text)
      if (timerRef.current) clearTimeout(timerRef.current)
      const q = text.trim()
      if (!q) {
        setResults([])
        return
      }
      setSearching(true)
      timerRef.current = setTimeout(async () => {
        const found = (await client?.searchUsers(q)) ?? []
        setResults(found)
        setSearching(false)
      }, 300)
    },
    [client],
  )

  function openConversation(user: IUser) {
    familiarsAtom.setKey(user.userID, user)
    setQuery('')
    setResults([])
    navigation.navigate('Conversation', { userID: user.userID, username: user.username })
  }

  function lastMessage(userID: string): DecryptedMail | undefined {
    const thread = allMessages[userID]
    return thread?.[thread.length - 1]
  }

  function renderFamiliar({ item }: { item: IUser }) {
    const last = lastMessage(item.userID)
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatar, { backgroundColor: `hsl(${hue(item.userID)}, 45%, 40%)` }]}>
          <Text style={styles.avatarText}>{item.username.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.username}>{item.username}</Text>
          {last && (
            <Text style={styles.preview} numberOfLines={1}>
              {last.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  function renderResult({ item }: { item: IUser }) {
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatarSm, { backgroundColor: `hsl(${hue(item.userID)}, 45%, 40%)` }]}>
          <Text style={styles.avatarSmText}>{item.username.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.resultName}>{item.username}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onSearch}
          placeholder="Find a user..."
          placeholderTextColor="#666666"
        />
      </View>

      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(u) => u.userID}
          renderItem={renderResult}
          style={styles.resultsList}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {query.trim() !== '' && results.length === 0 && !searching && (
        <Text style={styles.noResults}>No users found</Text>
      )}

      {searching && <Text style={styles.noResults}>Searching...</Text>}

      {familiarList.length === 0 && !query.trim() ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptyHint}>Search for a user to start messaging</Text>
        </View>
      ) : (
        <FlatList
          data={familiarList}
          keyExtractor={(u) => u.userID}
          renderItem={renderFamiliar}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  )
}

function hue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  searchWrap: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  searchInput: {
    backgroundColor: '#242424',
    color: '#e8e8e8',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  resultsList: { maxHeight: 200, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#202020' },
  avatarSm: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  resultName: { color: '#e8e8e8', fontSize: 14 },
  noResults: { color: '#666666', fontSize: 13, fontStyle: 'italic', paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  rowContent: { flex: 1 },
  username: { color: '#e8e8e8', fontSize: 15, fontWeight: '600' },
  preview: { color: '#666666', fontSize: 13, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666666', fontSize: 14, fontStyle: 'italic' },
  emptyHint: { color: '#555555', fontSize: 12, marginTop: 4 },
})
