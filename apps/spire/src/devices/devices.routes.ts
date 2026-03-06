import { Router } from 'express'
import { z } from 'zod'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { getOTKCount, saveOTKs } from '#keys/keys.service.ts'
import { OTKPayloadSchema } from '#keys/keys.schemas.ts'
import { validateBody } from '#middleware/validate.ts'
import type { RequestHandler } from 'express'

const OTKListSchema = z.array(OTKPayloadSchema).min(1)

export function createDeviceRouter(db: Kysely<Database>, checkAuth: RequestHandler): Router {
  const router = Router()

  router.get('/device/:id/otk/count', checkAuth, async (req, res, next) => {
    try {
      const device = await db
        .selectFrom('devices')
        .where('deviceID', '=', req.params.id)
        .select('owner')
        .executeTakeFirst()
      if (!device || device.owner !== req.user!.userID) {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      const count = await getOTKCount(db, req.params.id)
      res.json({ count })
    } catch (err) {
      next(err)
    }
  })

  router.post('/device/:id/otk', checkAuth, validateBody(OTKListSchema), async (req, res, next) => {
    try {
      const device = await db
        .selectFrom('devices')
        .where('deviceID', '=', req.params.id)
        .select('owner')
        .executeTakeFirst()
      if (!device || device.owner !== req.user!.userID) {
        res.status(403).json({ error: 'forbidden' })
        return
      }
      await saveOTKs(db, req.user!.userID, req.params.id, req.body)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}
