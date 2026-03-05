import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Extend Zod once — this module is the single call site.
extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

export const bearerAuth = registry.registerComponent(
  'securitySchemes',
  'bearerAuth',
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
)

/** Builds a Zod params object for OpenAPI path parameters. */
export function pid(names: string[]): ReturnType<typeof z.object> {
  return z.object(Object.fromEntries(names.map(n => [n, z.string()])))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateOpenAPIDocument(): any {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'vex-chat spire', version: '0.1.0' },
    servers: [
      {
        url: 'http://localhost:{port}',
        variables: { port: { default: '16777' } },
      },
    ],
  })
}

// ---------------------------------------------------------------------------
// OpenAPI path registrations
// Centralised here to avoid circular imports: route files export only Express
// routers; openapi.ts owns all registry.registerPath() calls.
// ---------------------------------------------------------------------------

const auth = [{ bearerAuth: [] }]

// Auth
registry.registerPath({ method: 'post', path: '/register',    operationId: 'register',    responses: { 200: { description: 'User created' }, 409: { description: 'Username taken' } } })
registry.registerPath({ method: 'post', path: '/auth',        operationId: 'login',       responses: { 200: { description: 'JWT issued' }, 401: { description: 'Invalid credentials' } } })
registry.registerPath({ method: 'post', path: '/whoami',      operationId: 'whoami',      security: auth, responses: { 200: { description: 'Authenticated user' }, 401: { description: 'Unauthorized' } } })
registry.registerPath({ method: 'post', path: '/goodbye',     operationId: 'logout',      responses: { 200: { description: 'Cookie cleared' } } })
registry.registerPath({ method: 'get',  path: '/token/{tokenType}', operationId: 'getToken', security: auth, request: { params: z.object({ tokenType: z.string() }) }, responses: { 200: { description: 'Action token' }, 400: { description: 'Invalid type' }, 401: { description: 'Unauthorized' } } })

// Users
registry.registerPath({ method: 'get',    path: '/user/{id}',                        operationId: 'getUser',          security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'User' },        404: { description: 'Not found' } } })
registry.registerPath({ method: 'get',    path: '/user/{id}/devices',                operationId: 'getUserDevices',   security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Device list' } } })
registry.registerPath({ method: 'post',   path: '/user/{id}/devices',                operationId: 'addDevice',        security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Device created' } } })
registry.registerPath({ method: 'delete', path: '/user/{userID}/devices/{deviceID}', operationId: 'deleteDevice',     security: auth, request: { params: pid(['userID', 'deviceID']) },      responses: { 200: { description: 'Deleted' } } })
registry.registerPath({ method: 'get',    path: '/user/{id}/permissions',            operationId: 'getUserPerms',     security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Permissions' } } })
registry.registerPath({ method: 'get',    path: '/user/{id}/servers',                operationId: 'getUserServers',   security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Servers' } } })
registry.registerPath({ method: 'get',    path: '/users/search',                     operationId: 'searchUsers',      security: auth, request: { query: z.object({ q: z.string() }) },        responses: { 200: { description: 'Matching users' } } })

// Devices
registry.registerPath({ method: 'get',  path: '/device/{id}',            operationId: 'getDevice',     security: auth, request: { params: pid(['id']) }, responses: { 200: { description: 'Device' },    404: { description: 'Not found' } } })
registry.registerPath({ method: 'post', path: '/device/{id}/connect',     operationId: 'wsConnect',     security: auth, request: { params: pid(['id']) }, responses: { 101: { description: 'WebSocket upgrade' } } })
registry.registerPath({ method: 'get',  path: '/device/{id}/otk/count',   operationId: 'getOtkCount',   security: auth, request: { params: pid(['id']) }, responses: { 200: { description: 'OTK count' } } })
registry.registerPath({ method: 'post', path: '/device/{id}/otk',         operationId: 'uploadOtks',    security: auth, request: { params: pid(['id']) }, responses: { 200: { description: 'OTKs saved' } } })

// Keys — X3DH key bundle for encrypted messaging
registry.registerPath({ method: 'get',  path: '/keys/{deviceID}',         operationId: 'getKeyBundle',  security: auth, request: { params: pid(['deviceID']) }, responses: { 200: { description: 'X3DH key bundle' }, 404: { description: 'No key bundle' } } })

// Mail — end-to-end encrypted message relay
registry.registerPath({ method: 'post', path: '/mail',                    operationId: 'sendMail',      security: auth, responses: { 200: { description: 'Mail stored' } } })
registry.registerPath({ method: 'get',  path: '/mail/{deviceID}',         operationId: 'getMail',       security: auth, request: { params: pid(['deviceID']) }, responses: { 200: { description: 'Pending mail' } } })

// Servers
registry.registerPath({ method: 'post',   path: '/server',                          operationId: 'createServer',     security: auth,                                                    responses: { 200: { description: 'Server created' }, 401: { description: 'Unauthorized' } } })
registry.registerPath({ method: 'get',    path: '/server/{id}',                     operationId: 'getServer',        security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'Server' },         404: { description: 'Not found' } } })
registry.registerPath({ method: 'delete', path: '/server/{id}',                     operationId: 'deleteServer',     security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'Deleted' },        403: { description: 'Forbidden' } } })
registry.registerPath({ method: 'post',   path: '/server/{id}/channels',            operationId: 'createChannel',    security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'Channel created' } } })
registry.registerPath({ method: 'get',    path: '/server/{id}/channels',            operationId: 'listChannels',     security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'Channel list' } } })
registry.registerPath({ method: 'delete', path: '/channel/{id}',                    operationId: 'deleteChannel',    security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'Deleted' } } })
registry.registerPath({ method: 'get',    path: '/server/{serverID}/permissions',   operationId: 'listPermissions',  security: auth, request: { params: pid(['serverID']) },            responses: { 200: { description: 'Permissions' },   401: { description: 'Unauthorized' } } })
registry.registerPath({ method: 'delete', path: '/permission/{id}',                 operationId: 'deletePermission', security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'Deleted' } } })
registry.registerPath({ method: 'post',   path: '/server/{serverID}/invites',       operationId: 'createInvite',     security: auth, request: { params: pid(['serverID']) },            responses: { 200: { description: 'Invite created' }, 401: { description: 'Unauthorized' } } })
registry.registerPath({ method: 'get',    path: '/server/{serverID}/invites',       operationId: 'listInvites',      security: auth, request: { params: pid(['serverID']) },            responses: { 200: { description: 'Invite list' } } })

// Files
registry.registerPath({ method: 'get',  path: '/file/{id}',              operationId: 'getFile',        security: auth, request: { params: pid(['id']) },                  responses: { 200: { description: 'File' },          404: { description: 'Not found' } } })
registry.registerPath({ method: 'post', path: '/file',                   operationId: 'uploadFile',     security: auth,                                                    responses: { 200: { description: 'File uploaded' } } })

// Avatars
registry.registerPath({ method: 'get',  path: '/avatar/{userID}',        operationId: 'getAvatar',      security: auth, request: { params: pid(['userID']) },              responses: { 200: { description: 'Avatar' },         404: { description: 'Not found' } } })
registry.registerPath({ method: 'post', path: '/avatar/{userID}',        operationId: 'uploadAvatar',   security: auth, request: { params: pid(['userID']) },              responses: { 200: { description: 'Avatar set' } } })

// Emojis — POST uses /server/{serverID}/emoji to avoid ambiguous path collision with GET /emoji/{emojiID}
registry.registerPath({ method: 'get',  path: '/emoji/{emojiID}',        operationId: 'getEmoji',       security: auth, request: { params: pid(['emojiID']) },             responses: { 200: { description: 'Emoji' },          404: { description: 'Not found' } } })
registry.registerPath({ method: 'post', path: '/server/{serverID}/emoji', operationId: 'uploadEmoji',   security: auth, request: { params: pid(['serverID']) },            responses: { 200: { description: 'Emoji created' } } })

// User lists (group members for E2EE)
registry.registerPath({ method: 'post', path: '/userList/{channelID}',   operationId: 'getUserList',    security: auth, request: { params: pid(['channelID']) },            responses: { 200: { description: 'User list' } } })
