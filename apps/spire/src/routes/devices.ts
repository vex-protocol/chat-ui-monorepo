import { registry } from '#openapi'
import { Router } from 'express'
import { z } from 'zod'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import { getOTKCount, saveOTKs } from '#keys/keys.service.js'
import { OTKPayloadSchema } from '#keys/keys.schemas.js'
import { checkAuth } from '../middleware/checkAuth.js'
import { validateBody } from '../middleware/validate.js'

const OTKListSchema = z.array(OTKPayloadSchema).min(1)

export function createDeviceRouter(db: Kysely<Database>): Router {
  const router = Router()

  router.get('/device/:id/otk/count', checkAuth, async (req, res, next) => {
    try {
      const count = await getOTKCount(db, req.params.id)
      res.json({ count })
    } catch (err) {
      next(err)
    }
  })

  router.post('/device/:id/otk', checkAuth, validateBody(OTKListSchema), async (req, res, next) => {
    try {
      await saveOTKs(db, req.user!.userID, req.params.id, req.body)
      res.json({ ok: true })
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
const pid = z.object({ id: z.string() })

registry.registerPath({ method: 'get',  path: '/device/{id}',            operationId: 'getDevice',     security: auth, request: { params: pid }, responses: { 200: { description: 'Device' },    404: { description: 'Not found' } } })
registry.registerPath({ method: 'post', path: '/device/{id}/keyBundle',   operationId: 'getKeyBundle',  security: auth, request: { params: pid }, responses: { 200: { description: 'Key bundle' } } })
registry.registerPath({ method: 'post', path: '/device/{id}/mail',        operationId: 'sendMail',      security: auth, request: { params: pid }, responses: { 200: { description: 'Mail sent' } } })
registry.registerPath({ method: 'post', path: '/device/{id}/connect',     operationId: 'wsConnect',     security: auth, request: { params: pid }, responses: { 101: { description: 'WebSocket upgrade' } } })
registry.registerPath({ method: 'get',  path: '/device/{id}/otk/count',   operationId: 'getOtkCount',   security: auth, request: { params: pid }, responses: { 200: { description: 'OTK count' } } })
registry.registerPath({ method: 'post', path: '/device/{id}/otk',         operationId: 'uploadOtks',    security: auth, request: { params: pid }, responses: { 200: { description: 'OTKs saved' } } })
