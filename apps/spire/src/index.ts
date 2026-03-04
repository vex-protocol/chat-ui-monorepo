/**
 * Public API surface for @vex-chat/spire.
 *
 * Import from here when using spire as a library. Use src/run.ts to
 * start the server process.
 */

// App factory
export { createApp } from './app.js'

// Database
export type { Database } from '#db/types.js'
export { createDb } from '#db/index.js'
export { migrateToLatest } from '#db/migrate.js'

// Auth
export type { CensoredUser, RegistrationPayload } from '#auth/auth.service.js'
export { createTokenStore } from '#auth/auth.service.js'

// Devices
export type { Device, DevicePayload } from '#devices/devices.schemas.js'

// Servers / Channels
export type { CreateServerPayload, CreateChannelPayload } from '#servers/servers.schemas.js'

// Mail
export type { MailPayload } from '#mail/mail.schemas.js'

// Permissions
export type { CreatePermission } from '#permissions/permissions.schemas.js'

// Invites
export type { CreateInvite } from '#invites/invites.schemas.js'

// Files / Emojis
export type { CreateFile, CreateEmoji } from '#files/files.schemas.js'

// OpenAPI
export { generateOpenAPIDocument, registry } from '#openapi'
