export const ALL_TOKEN_TYPES = [
  'file',
  'avatar',
  'register',
  'device',
  'invite',
  'emoji',
  'connect',
] as const

export type TokenType = (typeof ALL_TOKEN_TYPES)[number]

export interface IActionToken {
  key: string        // UUID v4 string
  scope: TokenType
  time: Date
}

export interface ITokenStore {
  /** Creates a single-use action token with a 10-minute TTL. */
  create(scope: TokenType): IActionToken
  /**
   * Validates and consumes a token. Returns true exactly once for a valid,
   * unexpired token of the correct scope.
   */
  validate(key: string, scope: TokenType): boolean
}
