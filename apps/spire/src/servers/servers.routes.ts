import { Router } from 'express'
import { z } from 'zod'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import {
  createServer,
  getServer,
  deleteServer,
  createChannel,
  getChannels,
} from '#servers/servers.service.ts'
import { CreateServerSchema, CreateChannelSchema } from '#servers/servers.schemas.ts'
import {
  createPermission,
  getPermissionsByResource,
  deletePermission,
  hasPermission,
} from '#permissions/permissions.service.ts'
import { createInvite, getServerInvites } from '#invites/invites.service.ts'
import { validateBody } from '#middleware/validate.ts'
import type { RequestHandler } from 'express'
import { NotFoundError, ForbiddenError } from '#errors'

const DELETE_POWER = 50
const INVITE_POWER = 25

const CreateInviteBodySchema = z.object({
  expiration: z.string().datetime().nullable(),
})

const CreateChannelBodySchema = z.object({
  name: z.string().min(1),
})

export function createServerRouter(db: Kysely<Database>, checkAuth: RequestHandler): Router {
  const router = Router()

  router.post('/server', checkAuth, validateBody(CreateServerSchema), async (req, res, next) => {
    try {
      const server = await createServer(db, req.body.name, req.body.icon)
      await createPermission(db, req.user!.userID, 'server', server.serverID, 100)
      res.json(server)
    } catch (err) {
      next(err)
    }
  })

  router.get('/server/:id', checkAuth, async (req, res, next) => {
    try {
      const server = await getServer(db, req.params.id)
      if (!server) return next(new NotFoundError('Server not found'))
      res.json(server)
    } catch (err) {
      next(err)
    }
  })

  router.delete('/server/:id', checkAuth, async (req, res, next) => {
    try {
      const allowed = await hasPermission(db, req.user!.userID, req.params.id, DELETE_POWER)
      if (!allowed) return next(new ForbiddenError())
      await deleteServer(db, req.params.id)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  router.post('/server/:id/channels', checkAuth, validateBody(CreateChannelBodySchema), async (req, res, next) => {
    try {
      const channel = await createChannel(db, req.params.id, req.body.name)
      res.json(channel)
    } catch (err) {
      next(err)
    }
  })

  router.get('/server/:id/channels', checkAuth, async (req, res, next) => {
    try {
      const channels = await getChannels(db, req.params.id)
      res.json(channels)
    } catch (err) {
      next(err)
    }
  })

  router.get('/server/:serverID/permissions', checkAuth, async (req, res, next) => {
    try {
      const perms = await getPermissionsByResource(db, req.params.serverID)
      res.json(perms)
    } catch (err) {
      next(err)
    }
  })

  router.delete('/permission/:id', checkAuth, async (req, res, next) => {
    try {
      await deletePermission(db, req.params.id)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  router.post('/server/:serverID/invites', checkAuth, validateBody(CreateInviteBodySchema), async (req, res, next) => {
    try {
      const allowed = await hasPermission(db, req.user!.userID, req.params.serverID, INVITE_POWER)
      if (!allowed) return next(new ForbiddenError())
      const invite = await createInvite(db, req.params.serverID, req.user!.userID, req.body.expiration)
      res.json(invite)
    } catch (err) {
      next(err)
    }
  })

  router.get('/server/:serverID/invites', checkAuth, async (req, res, next) => {
    try {
      const invites = await getServerInvites(db, req.params.serverID)
      res.json(invites)
    } catch (err) {
      next(err)
    }
  })

  return router
}
