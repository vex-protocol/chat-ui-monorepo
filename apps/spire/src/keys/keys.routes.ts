import { Router } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { getKeyBundle } from '#keys/keys.service.ts'
import type { RequestHandler } from 'express'
import { NotFoundError } from '#errors'

export function createKeysRouter(db: Kysely<Database>, checkAuth: RequestHandler): Router {
  const router = Router()

  router.get('/keys/:deviceID', checkAuth, async (req, res, next) => {
    try {
      const bundle = await getKeyBundle(db, req.params.deviceID)
      if (!bundle) return next(new NotFoundError('No key bundle for device'))
      res.json(bundle)
    } catch (err) {
      next(err)
    }
  })

  return router
}
