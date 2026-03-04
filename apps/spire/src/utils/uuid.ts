import { parse as uuidParse } from 'uuid'

export function createUUID(): string {
  return crypto.randomUUID()
}

export function uuidToUint8(uuid: string): Uint8Array {
  return uuidParse(uuid) as Uint8Array
}
