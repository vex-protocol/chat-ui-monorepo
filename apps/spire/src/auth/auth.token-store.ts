import { v4 as uuidv4 } from 'uuid'

const TOKEN_EXPIRY = 10 * 60 * 1000 // 10 minutes in ms

export const ALL_TOKEN_TYPES = ['file', 'avatar', 'register', 'device', 'invite', 'emoji', 'connect'] as const
export type TokenType = (typeof ALL_TOKEN_TYPES)[number]

export interface IActionToken {
  key: string    // UUID v4 string
  scope: TokenType
  time: Date
}

export interface ITokenStore {
  /** Creates a single-use action token with a 10-minute TTL. */
  create(scope: TokenType): IActionToken
  /**
   * Validates and consumes a token. Returns true exactly once for a valid,
   * unexpired token of the correct scope. Returns false for wrong scope,
   * expired (>10 min), already-consumed, or unknown tokens.
   */
  validate(key: string, scope: TokenType): boolean
}

/** Factory — one store per server instance (never a module singleton). */
export function createTokenStore(): ITokenStore {
  const store = new Map<string, IActionToken>()

  // Sweep expired tokens every 5 minutes to prevent unbounded Map growth.
  // .unref() ensures this timer never keeps the Node.js process alive on its own —
  // critical for clean test teardown and graceful shutdown.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - TOKEN_EXPIRY
    for (const [key, token] of store) {
      if (token.time.getTime() < cutoff) store.delete(key)
    }
  }, 5 * 60 * 1000)
  sweep.unref()

  return {
    create(scope: TokenType): IActionToken {
      const token: IActionToken = { key: uuidv4(), scope, time: new Date() }
      store.set(token.key, token)
      return token
    },

    validate(key: string, scope: TokenType): boolean {
      const token = store.get(key)
      if (!token) return false
      if (token.scope !== scope) return false
      if (Date.now() - token.time.getTime() > TOKEN_EXPIRY) {
        store.delete(key) // lazy expiry: sweep may not have run yet
        return false
      }
      store.delete(key) // single-use: consumed on first valid use
      return true
    },
  }
}
