/**
 * Kysely Database interface — the single source of truth for all table row types.
 * Implementations of these types are created by the migrations in ./migrations/.
 */

export interface UsersTable {
  userID: string        // UUID primary key
  username: string      // unique
  passwordHash: string
  lastSeen: string      // ISO timestamp
}

export interface DevicesTable {
  deviceID: string      // UUID primary key
  signKey: string       // unique, 64 hex chars (NaCl signing public key)
  owner: string         // FK → users.userID
  name: string
  lastLogin: string | null  // ISO timestamp
  deleted: number           // 0 | 1 (SQLite boolean)
}

export interface PreKeysTable {
  keyID: string         // UUID primary key
  userID: string        // indexed
  deviceID: string      // unique, indexed
  publicKey: string     // 64 hex chars
  signature: string
  index: number
}

export interface OneTimeKeysTable {
  keyID: string         // UUID primary key
  userID: string        // indexed
  deviceID: string      // indexed
  publicKey: string     // 64 hex chars
  signature: string
  index: number
}

export interface MailTable {
  nonce: string         // UUID primary key
  recipient: string     // indexed (deviceID of recipient)
  mailID: string
  sender: string
  header: string
  cipher: string        // encrypted message body (large text)
  group: string | null
  extra: string | null
  mailType: string
  time: string          // ISO timestamp
  forward: string | null
  authorID: string
  readerID: string
}

export interface ServersTable {
  serverID: string      // UUID primary key
  name: string
  icon: string
}

export interface ChannelsTable {
  channelID: string     // UUID primary key
  serverID: string      // indexed
  name: string
}

export interface PermissionsTable {
  permissionID: string  // UUID primary key
  userID: string        // indexed
  resourceType: string
  resourceID: string    // indexed
  powerLevel: number
}

export interface FilesTable {
  fileID: string        // UUID primary key
  owner: string         // indexed (userID)
  nonce: string
}

export interface EmojisTable {
  emojiID: string       // UUID primary key
  owner: string         // indexed (serverID)
  name: string
}

export interface InvitesTable {
  inviteID: string      // UUID primary key
  serverID: string      // indexed
  owner: string         // userID
  expiration: string | null  // ISO timestamp, null = never expires
}

export interface Database {
  users: UsersTable
  devices: DevicesTable
  preKeys: PreKeysTable
  oneTimeKeys: OneTimeKeysTable
  mail: MailTable
  servers: ServersTable
  channels: ChannelsTable
  permissions: PermissionsTable
  files: FilesTable
  emojis: EmojisTable
  invites: InvitesTable
}
