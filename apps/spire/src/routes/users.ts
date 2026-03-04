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
