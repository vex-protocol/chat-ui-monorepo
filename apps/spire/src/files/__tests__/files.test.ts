import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.js'
import {
  createFile,
  getFile,
  createEmoji,
  getEmoji,
  getEmojiList,
  deleteEmoji,
  getFilePath,
  getAvatarPath,
  getEmojiPath,
  validateImageMime,
  assertUnderLimit,
} from '../files.service.js'

// ---------------------------------------------------------------------------
// createFile / getFile
// ---------------------------------------------------------------------------

describe('createFile', () => {
  it('creates a file record and returns correct fields', async () => {
    const db = await useDb()
    const ownerID = uuidv4()
    const nonce = uuidv4()

    const file = await createFile(db, ownerID, nonce)

    expect(file.fileID).toBeTypeOf('string')
    expect(file.owner).toBe(ownerID)
    expect(file.nonce).toBe(nonce)
  })
})

describe('getFile', () => {
  it('returns the file for a valid fileID', async () => {
    const db = await useDb()
    const file = await createFile(db, uuidv4(), uuidv4())

    const found = await getFile(db, file.fileID)
    expect(found).not.toBeNull()
    expect(found?.fileID).toBe(file.fileID)
    expect(found?.nonce).toBe(file.nonce)
  })

  it('returns null for an unknown fileID', async () => {
    const db = await useDb()
    expect(await getFile(db, uuidv4())).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createEmoji / getEmoji / getEmojiList / deleteEmoji
// ---------------------------------------------------------------------------

describe('createEmoji', () => {
  it('creates an emoji record and returns correct fields', async () => {
    const db = await useDb()
    const serverID = uuidv4()

    const emoji = await createEmoji(db, serverID, 'fire')

    expect(emoji.emojiID).toBeTypeOf('string')
    expect(emoji.owner).toBe(serverID)
    expect(emoji.name).toBe('fire')
  })
})

describe('getEmoji', () => {
  it('returns the emoji for a valid emojiID', async () => {
    const db = await useDb()
    const emoji = await createEmoji(db, uuidv4(), 'heart')

    const found = await getEmoji(db, emoji.emojiID)
    expect(found?.emojiID).toBe(emoji.emojiID)
    expect(found?.name).toBe('heart')
  })

  it('returns null for an unknown emojiID', async () => {
    const db = await useDb()
    expect(await getEmoji(db, uuidv4())).toBeNull()
  })
})

describe('getEmojiList', () => {
  it('returns all emojis for the server', async () => {
    const db = await useDb()
    const serverID = uuidv4()
    await createEmoji(db, serverID, 'fire')
    await createEmoji(db, serverID, 'heart')

    const emojis = await getEmojiList(db, serverID)
    expect(emojis).toHaveLength(2)
    expect(emojis.map(e => e.name)).toEqual(expect.arrayContaining(['fire', 'heart']))
  })

  it('returns an empty array for a server with no emojis', async () => {
    const db = await useDb()
    expect(await getEmojiList(db, uuidv4())).toEqual([])
  })

  it('does not return emojis from other servers', async () => {
    const db = await useDb()
    const s1 = uuidv4()
    const s2 = uuidv4()
    await createEmoji(db, s1, 'fire')

    expect(await getEmojiList(db, s2)).toEqual([])
  })
})

describe('deleteEmoji', () => {
  it('removes the emoji row', async () => {
    const db = await useDb()
    const emoji = await createEmoji(db, uuidv4(), 'trash')

    await deleteEmoji(db, emoji.emojiID)

    expect(await getEmoji(db, emoji.emojiID)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

describe('getFilePath', () => {
  it('returns a path string containing the fileID', () => {
    const fileID = uuidv4()
    const path = getFilePath(fileID)
    expect(path).toBeTypeOf('string')
    expect(path).toContain(fileID)
  })
})

describe('getAvatarPath', () => {
  it('returns a path string containing the userID', () => {
    const userID = uuidv4()
    const path = getAvatarPath(userID)
    expect(path).toBeTypeOf('string')
    expect(path).toContain(userID)
  })
})

describe('getEmojiPath', () => {
  it('returns a path string containing the emojiID', () => {
    const emojiID = uuidv4()
    const path = getEmojiPath(emojiID)
    expect(path).toBeTypeOf('string')
    expect(path).toContain(emojiID)
  })
})

// ---------------------------------------------------------------------------
// validateImageMime
// ---------------------------------------------------------------------------

describe('validateImageMime', () => {
  it.each(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])(
    'accepts %s',
    (mime) => {
      expect(validateImageMime(mime)).toBe(true)
    },
  )

  it.each(['text/plain', 'application/json', 'application/octet-stream', 'image/svg+xml'])(
    'rejects %s',
    (mime) => {
      expect(validateImageMime(mime)).toBe(false)
    },
  )
})

// ---------------------------------------------------------------------------
// assertUnderLimit
// ---------------------------------------------------------------------------

describe('assertUnderLimit', () => {
  it('does not throw when file size is under the limit', () => {
    expect(() => assertUnderLimit(1024, 5 * 1024 * 1024)).not.toThrow()
  })

  it('does not throw when file size equals the limit', () => {
    expect(() => assertUnderLimit(5 * 1024 * 1024, 5 * 1024 * 1024)).not.toThrow()
  })

  it('throws when file size exceeds the limit', () => {
    expect(() => assertUnderLimit(5 * 1024 * 1024 + 1, 5 * 1024 * 1024)).toThrow()
  })
})
