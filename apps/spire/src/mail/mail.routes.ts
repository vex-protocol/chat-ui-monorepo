import { Router } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { saveMail, retrieveMail } from '#mail/mail.service.ts'
import { MailPayloadSchema } from '#mail/mail.schemas.ts'
import { validateBody } from '#middleware/validate.ts'
import type { RequestHandler } from 'express'

export function createMailRouter(
  db: Kysely<Database>,
  checkAuth: RequestHandler,
  sendToDevice?: (deviceID: string, data: string) => void,
): Router {
  const router = Router()

  /**
   * POST /mail — store an encrypted mail message and attempt real-time delivery.
   *
   * The server stores ciphertext only and never sees plaintext.
   * If the recipient is connected via WebSocket, the message is pushed immediately.
   */
  router.post('/mail', checkAuth, validateBody(MailPayloadSchema), async (req, res, next) => {
    try {
      await saveMail(db, req.body)
      sendToDevice?.(req.body.recipient as string, JSON.stringify({ resource: 'mail', ...req.body }))
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  /**
   * GET /mail/:deviceID — fetch and consume all pending mail for a device.
   *
   * Follows the relay model: rows are deleted immediately after retrieval.
   * Clients should call this on reconnect to drain any queued messages.
   */
  router.get('/mail/:deviceID', checkAuth, async (req, res, next) => {
    try {
      const mail = await retrieveMail(db, req.params.deviceID)
      res.json(mail)
    } catch (err) {
      next(err)
    }
  })

  return router
}
