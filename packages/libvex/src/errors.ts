export type VexErrorCode =
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'AUTH_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_INPUT'
  | 'SERVER_ERROR'

export interface VexError {
  code: VexErrorCode
  message: string
}

export function makeError(code: VexErrorCode, message: string): VexError {
  return { code, message }
}

export function errorFromStatus(status: number, message: string): VexError {
  if (status === 401 || status === 403) return makeError('PERMISSION_DENIED', message)
  if (status === 404) return makeError('NOT_FOUND', message)
  if (status === 409) return makeError('CONFLICT', message)
  if (status === 422 || status === 400) return makeError('INVALID_INPUT', message)
  if (status === 429) return makeError('RATE_LIMITED', message)
  return makeError('SERVER_ERROR', message)
}
