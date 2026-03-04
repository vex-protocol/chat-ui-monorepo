/**
 * OpenAPI path registrations for routes not yet implemented as Express handlers.
 * Import this file alongside the route files to get full spec coverage.
 */
import { z } from 'zod'
import { registry } from '#openapi'

const auth = [{ bearerAuth: [] }]
const pid = (names: string[]) => z.object(Object.fromEntries(names.map(n => [n, z.string()])))

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
