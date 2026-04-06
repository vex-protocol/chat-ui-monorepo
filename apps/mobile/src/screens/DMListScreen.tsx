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
import type { IUser } from '@vex-chat/libvex'
import type { IMessage } from '@vex-chat/libvex'
import { $familiars, $messages, $client } from '../store'
import { $familiars as familiarsAtom, $dmUnreadCounts, avatarHue } from '@vex-chat/store'
import { colors, typography } from '../theme'
import { ChatHeader } from '../components/ChatHeader'

export function DMListScreen({ navigation }: { navigation: any }) {
  const familiars = useStore($familiars)
  const allMessages = useStore($messages)
  const client = useStore($client)
  const unreadCounts = useStore($dmUnreadCounts)

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
        const [user] = (await client?.users.retrieve(q)) ?? [null]
        const found = user ? [user] : []
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

  function lastMessage(userID: string): IMessage | undefined {
    const thread = allMessages[userID]
    return thread?.[thread.length - 1]
  }

  function renderFamiliar({ item }: { item: IUser }) {
    const last = lastMessage(item.userID)
    const unread = unreadCounts[item.userID] ?? 0
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatar, { backgroundColor: `hsl(${avatarHue(item.userID)}, 45%, 40%)` }]}>
          <Text style={styles.avatarText}>{item.username.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.username}>{item.username}</Text>
          {last && (
            <Text style={styles.preview} numberOfLines={1}>
              {last.message}
            </Text>
          )}
        </View>
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  function renderResult({ item }: { item: IUser }) {
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => openConversation(item)}
      >
        <View style={[styles.avatarSm, { backgroundColor: `hsl(${avatarHue(item.userID)}, 45%, 40%)` }]}>
          <Text style={styles.avatarSmText}>{item.username.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.resultName}>{item.username}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <ChatHeader title="Home" />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onSearch}
          placeholder="Search by exact username..."
          placeholderTextColor={colors.mutedDark}
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchWrap: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  searchInput: {
    backgroundColor: colors.input,
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  resultsList: {
    maxHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  resultName: {
    ...typography.button,
    color: colors.textSecondary,
  },
  noResults: {
    ...typography.body,
    color: colors.mutedDark,
    fontStyle: 'italic',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  rowContent: {
    flex: 1,
  },
  username: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 15,
  },
  preview: {
    ...typography.body,
    color: colors.mutedDark,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.mutedDark,
    fontStyle: 'italic',
  },
  emptyHint: {
    ...typography.body,
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
})
