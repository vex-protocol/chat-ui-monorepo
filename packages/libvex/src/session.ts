/**
 * SessionManager — X3DH-lite key exchange and message encryption/decryption.
 *
 * Design decisions (arch-decision-decryption-belongs-in-the-sdk-libvex):
 *   - Apps never see IMail ciphertext. VexClient decrypts before emitting DecryptedMail.
 *   - Each outbound message uses a fresh ephemeral X25519 key pair (no session caching V1).
 *   - Key derivation uses a 3-DH scheme: identity×preKey, ephemeral×identity, ephemeral×preKey.
 *   - Sender stores sender's signKey (hex Ed25519 pubkey) in mail.sender — receiver uses it for DH.
 *
 * Wire format for mail.header: hex(ephemeral_X25519_pubkey_32bytes) — 64 hex chars.
 * Wire format for mail.nonce:  hex(xsalsa20poly1305_nonce_24bytes) — 48 hex chars.
 * Wire format for mail.cipher: hex(authenticated_ciphertext)       — variable length.
 */
import {
  convertPublicKey,
  convertSecretKey,
  generateDHKeyPair,
  dh,
  deriveSessionKey,
  derivePublicKey,
  encodeHex,
  decodeHex,
  generateNonce,
  encryptSecretBox,
  decryptSecretBox,
  computeFingerprint,
} from '@vex-chat/crypto'
import type { IMail, IKeyBundle, DecryptedMail } from '@vex-chat/types'

/**
 * Metadata required to build the IMail fields not covered by encryption.
 */
export interface MailMeta {
  senderDeviceID: string   // UUID — stored in mail.recipient for routing
  senderUserID: string     // userID of sender
  recipientDeviceID: string // UUID — stored in mail.recipient for delivery
  recipientUserID: string  // userID of recipient
  group?: string | null    // channelID for group messages, null for DMs
  mailType?: string
  extra?: string | null
}

/**
 * Derives a 32-byte session key from three Diffie-Hellman outputs using HKDF-SHA256.
 *
 * 3-DH key derivation (X3DH-lite):
 *   DH1 = ECDH(myIdentitySecret, theirPreKeyPub)   — sender identity × recipient preKey
 *   DH2 = ECDH(ephemeralSecret,  theirIdentityPub)  — ephemeral × recipient identity
 *   DH3 = ECDH(ephemeralSecret,  theirPreKeyPub)    — ephemeral × recipient preKey
 *
 * The receiver mirrors this with their own secret keys:
 *   DH1 = ECDH(myPreKeySecret,   senderIdentityPub) — symmetric: same result
 *   DH2 = ECDH(myIdentitySecret, ephemeralPub)       — symmetric: same result
 *   DH3 = ECDH(myPreKeySecret,   ephemeralPub)       — symmetric: same result
 */
function deriveKey(dh1: Uint8Array, dh2: Uint8Array, dh3: Uint8Array): Uint8Array {
  const ikm = new Uint8Array(dh1.length + dh2.length + dh3.length)
  ikm.set(dh1)
  ikm.set(dh2, dh1.length)
  ikm.set(dh3, dh1.length + dh2.length)
  return deriveSessionKey(ikm)
}

export class SessionManager {
  /** X25519 secret key derived from Ed25519 identity key. */
  private readonly myIdX: Uint8Array
  /** X25519 secret key derived from Ed25519 preKey (null if preKey not provided). */
  private readonly myPreKeyX: Uint8Array | null
  /** hex(Ed25519 pubkey) — stored in mail.sender so receivers can derive DH. */
  readonly signKey: string

  /**
   * @param deviceKey   - Ed25519 secret key seed (32 bytes). The device identity key.
   * @param preKeySecret - Ed25519 secret key seed (32 bytes) of the registered preKey.
   *                       Required for decryption. If absent, decrypt() returns null.
   */
  constructor(
    private readonly deviceKey: Uint8Array,
    preKeySecret?: Uint8Array,
  ) {
    this.myIdX = convertSecretKey(deviceKey)
    this.myPreKeyX = preKeySecret ? convertSecretKey(preKeySecret) : null
    this.signKey = encodeHex(derivePublicKey(deviceKey))
  }

  /**
   * Computes a conversation fingerprint for verification with the given party.
   * Order-independent: both sides produce the same string.
   *
   * @param theirSignKey - Hex-encoded Ed25519 public key of the other party
   * @returns Formatted fingerprint like "A1B2 C3D4 E5F6 ..."
   */
  fingerprint(theirSignKey: string): string {
    return computeFingerprint(this.signKey, theirSignKey)
  }

  /**
   * Encrypts `content` for the recipient described by `bundle`.
   * Returns an IMail-shaped object with all wire fields populated except
   * mailID and time, which are assigned by the server.
   */
  encryptMail(
    content: string,
    bundle: IKeyBundle,
    meta: MailMeta,
  ): Omit<IMail, 'mailID' | 'time'> {
    // Convert recipient's Ed25519 keys to X25519
    const recipientIdX = convertPublicKey(decodeHex(bundle.signKey))
    const recipientPreKeyX = convertPublicKey(decodeHex(bundle.preKey.publicKey))

    // Generate a fresh ephemeral X25519 key pair for this message
    const ephemeral = generateDHKeyPair()

    // 3-DH key derivation
    const sessionKey = deriveKey(
      dh(this.myIdX, recipientPreKeyX),        // DH1: sender identity × recipient preKey
      dh(ephemeral.secretKey, recipientIdX),    // DH2: ephemeral × recipient identity
      dh(ephemeral.secretKey, recipientPreKeyX), // DH3: ephemeral × recipient preKey
    )

    const nonce = generateNonce()
    const cipherBytes = encryptSecretBox(new TextEncoder().encode(content), nonce, sessionKey)

    return {
      // Sender's signKey (hex Ed25519 pubkey) — not the UUID — so receiver can compute DH
      sender: this.signKey,
      recipient: meta.recipientDeviceID,
      authorID: meta.senderUserID,
      readerID: meta.recipientUserID,
      // 64 hex chars: ephemeral X25519 pubkey
      header: encodeHex(ephemeral.publicKey),
      nonce: encodeHex(nonce),
      cipher: encodeHex(cipherBytes),
      group: meta.group ?? null,
      mailType: meta.mailType ?? 'message',
      extra: meta.extra ?? null,
      forward: null,
    }
  }

  /**
   * Decrypts an incoming IMail.
   * Returns DecryptedMail on success, or null if authentication fails or
   * preKeySecret was not provided at construction.
   *
   * Assumes mail.sender = hex(sender's Ed25519 pubkey).
   * Assumes mail.header = hex(ephemeral X25519 pubkey, 32 bytes).
   */
  decrypt(mail: IMail): DecryptedMail | null {
    if (!this.myPreKeyX) return null

    try {
      // Sender's Ed25519 pubkey → X25519
      const senderIdPubX = convertPublicKey(decodeHex(mail.sender))
      // Sender's ephemeral X25519 pubkey (from header)
      const ephemeralPub = decodeHex(mail.header)

      // Mirror of encryptMail — 3-DH receiver-side derivation
      const sessionKey = deriveKey(
        dh(this.myPreKeyX, senderIdPubX),  // DH1: my preKey × sender identity
        dh(this.myIdX, ephemeralPub),       // DH2: my identity × sender ephemeral
        dh(this.myPreKeyX, ephemeralPub),   // DH3: my preKey × sender ephemeral
      )

      const nonce = decodeHex(mail.nonce)
      const cipherBytes = decodeHex(mail.cipher)
      const plaintext = decryptSecretBox(cipherBytes, nonce, sessionKey)
      if (!plaintext) return null

      return {
        mailID: mail.mailID,
        authorID: mail.authorID,
        readerID: mail.readerID,
        group: mail.group,
        mailType: mail.mailType,
        time: mail.time,
        content: new TextDecoder().decode(plaintext),
        extra: mail.extra,
        forward: mail.forward,
      }
    } catch {
      return null
    }
  }
}
