import { Router } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { getUser, getServersForUser, searchUsers } from '#users/users.service.ts'
import { createDevice, retrieveUserDeviceList, deleteDevice, retrieveDevice } from '#devices/devices.service.ts'
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

  router.get('/user/:id/servers', checkAuth, async (req, res, next) => {
    try {
      const servers = await getServersForUser(db, req.params.id)
      res.json(servers)
    } catch (err) {
      next(err)
    }
  })

  router.get('/users/search', checkAuth, async (req, res, next) => {
    try {
      const q = String(req.query['q'] ?? '').trim()
      if (!q) return res.json([])
      const results = await searchUsers(db, q)
      res.json(results)
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

  router.delete('/user/:id/devices/:deviceID', checkAuth, async (req, res, next) => {
    try {
      if (req.user!.userID !== req.params.id) {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const device = await retrieveDevice(db, req.params.deviceID)
      if (!device || device.owner !== req.user!.userID) {
        res.status(404).json({ error: 'Device not found' })
        return
      }
      const allDevices = await retrieveUserDeviceList(db, req.user!.userID)
      if (allDevices.length <= 1) {
        res.status(400).json({ error: 'Cannot delete your last device' })
        return
      }
      await deleteDevice(db, req.params.deviceID)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}
