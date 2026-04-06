/**
 * IndexedDB persistence for IMessage messages.
 *
 * Messages are stored with a computed `threadKey` so they can be loaded
 * per-conversation on startup. DM threadKey = other party's userID;
 * group threadKey = channelID (mail.group).
 */
import type { IMessage } from '@vex-chat/libvex'

const DB_NAME = 'vex-messages'
const DB_VERSION = 1
const STORE = 'messages'

let cached: IDBDatabase | null = null

function getDB(): Promise<IDBDatabase> {
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'mailID' })
        store.createIndex('by-thread', ['threadKey', 'time'])
      }
    }
    req.onsuccess = () => {
      cached = req.result
      cached.onclose = () => { cached = null }
      resolve(cached)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveMessage(mail: IMessage, currentUserID: string): Promise<void> {
  const threadKey = mail.group ?? (mail.authorID === currentUserID ? mail.readerID : mail.authorID)
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...mail, threadKey })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadAllMessages(): Promise<{
  dms: Record<string, IMessage[]>
  groups: Record<string, IMessage[]>
}> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const dms: Record<string, IMessage[]> = {}
      const groups: Record<string, IMessage[]> = {}
      for (const msg of req.result) {
        const key: string = msg.threadKey
        if (msg.group) {
          ;(groups[key] ??= []).push(msg)
        } else {
          ;(dms[key] ??= []).push(msg)
        }
      }
      // Sort each thread by time
      for (const arr of [...Object.values(dms), ...Object.values(groups)]) {
        arr.sort((a, b) => a.time.localeCompare(b.time))
      }
      resolve({ dms, groups })
    }
    req.onerror = () => reject(req.error)
  })
}

export async function clearMessages(): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── PersistenceCallbacks adapter ──────────────────────────────────────────────

import type { PersistenceCallbacks } from '@vex-chat/store'

/**
 * Bulk-save by writing all messages for each thread to IndexedDB.
 * PersistenceCallbacks expects (full state) → save, so we put every message.
 */
async function saveGroupMessages(groups: Record<string, IMessage[]>): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  for (const [channelID, msgs] of Object.entries(groups)) {
    for (const mail of msgs) store.put({ ...mail, threadKey: channelID })
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function saveDmMessages(dms: Record<string, IMessage[]>): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  for (const [userID, msgs] of Object.entries(dms)) {
    for (const mail of msgs) store.put({ ...mail, threadKey: userID })
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export const desktopPersistence: PersistenceCallbacks = {
  loadMessages: loadAllMessages,
  saveGroupMessages,
  saveDmMessages,
}
