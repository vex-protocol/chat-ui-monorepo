/**
 * Public API surface for @vex-chat/spire.
 *
 * Import from here when using spire as a library. Use src/run.ts to
 * start the server process.
 */

// App factory
export { createApp } from './app.ts'

// Database
export type { Database } from '#db/types.ts'
export { createDb } from '#db/index.ts'
export { migrateToLatest } from '#db/migrate.ts'

// Auth
export type { CensoredUser, RegistrationPayload } from '#auth/auth.schemas.ts'
export { createTokenStore } from '#auth/auth.token-store.ts'

// Devices
export type { Device, DevicePayload } from '#devices/devices.schemas.ts'

// Servers / Channels
export type { CreateServerPayload, CreateChannelPayload } from '#servers/servers.schemas.ts'

// Mail
export type { MailPayload } from '#mail/mail.schemas.ts'

// Permissions
export type { CreatePermission } from '#permissions/permissions.schemas.ts'

// Invites
export type { CreateInvite } from '#invites/invites.schemas.ts'

// Files / Emojis
export type { CreateFile, CreateEmoji } from '#files/files.schemas.ts'

// OpenAPI
export { generateOpenAPIDocument, registry } from '#openapi'
