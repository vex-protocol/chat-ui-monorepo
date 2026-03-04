import { registry, pid } from '#openapi'
import { Router } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import { createDevice, retrieveUserDeviceList } from '#devices/devices.service.js'
import { DevicePayloadSchema } from '#devices/devices.schemas.js'
import { checkAuth } from '../middleware/checkAuth.js'
import { validateBody } from '../middleware/validate.js'
import { NotFoundError } from '#errors'

export function createUserRouter(db: Kysely<Database>): Router {
  const router = Router()

  router.get('/user/:id', checkAuth, async (req, res, next) => {
    try {
      const row = await db
        .selectFrom('users')
        .where('userID', '=', req.params.id)
        .select(['userID', 'username', 'lastSeen'])
        .executeTakeFirst()
      if (!row) return next(new NotFoundError('User not found'))
      res.json(row)
    } catch (err) {
      next(err)
    }
  })

  router.get('/user/:id/devices', checkAuth, async (req, res, next) => {
    try {
      const devices = await retrieveUserDeviceList(db, req.params.id)
      res.json(devices)
    } catch (err) {
      next(err)
    }
  })

  router.post('/user/:id/devices', checkAuth, validateBody(DevicePayloadSchema), async (req, res, next) => {
    try {
      const device = await createDevice(db, req.params.id, req.body)
      res.json(device)
    } catch (err) {
      next(err)
    }
  })

  return router
}

// ---------------------------------------------------------------------------
// OpenAPI registrations
// ---------------------------------------------------------------------------

const auth = [{ bearerAuth: [] }]

registry.registerPath({ method: 'get',    path: '/user/{id}',                        operationId: 'getUser',          security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'User' },        404: { description: 'Not found' } } })
registry.registerPath({ method: 'get',    path: '/user/{id}/devices',                operationId: 'getUserDevices',   security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Device list' } } })
registry.registerPath({ method: 'post',   path: '/user/{id}/devices',                operationId: 'addDevice',        security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Device created' } } })
registry.registerPath({ method: 'delete', path: '/user/{userID}/devices/{deviceID}', operationId: 'deleteDevice',     security: auth, request: { params: pid(['userID', 'deviceID']) },      responses: { 200: { description: 'Deleted' } } })
registry.registerPath({ method: 'get',    path: '/user/{id}/permissions',            operationId: 'getUserPerms',     security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Permissions' } } })
registry.registerPath({ method: 'get',    path: '/user/{id}/servers',                operationId: 'getUserServers',   security: auth, request: { params: pid(['id']) },                      responses: { 200: { description: 'Servers' } } })
