import { Router } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { getUser } from '#users/users.service.ts'
import { createDevice, retrieveUserDeviceList } from '#devices/devices.service.ts'
import { DevicePayloadSchema } from '#devices/devices.schemas.ts'
import { validateBody } from '#middleware/validate.ts'
import type { RequestHandler } from 'express'
import { NotFoundError } from '#errors'

export function createUserRouter(db: Kysely<Database>, checkAuth: RequestHandler): Router {
  const router = Router()

  router.get('/user/:id', checkAuth, async (req, res, next) => {
    try {
      const user = await getUser(db, req.params.id)
      if (!user) return next(new NotFoundError('User not found'))
      res.json(user)
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
