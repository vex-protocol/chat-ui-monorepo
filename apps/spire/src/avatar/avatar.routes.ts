import express, { Router } from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { RequestHandler } from 'express'
import { getAvatarPath, validateImageMime } from '#files/files.service.ts'
import { NotFoundError } from '#errors'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

export function createAvatarRouter(dataDir: string, checkAuth: RequestHandler): Router {
  const router = Router()

  /** GET /avatar/:userID — public, no auth required */
  router.get('/avatar/:userID', async (req, res, next) => {
    try {
      const rel = getAvatarPath(req.params.userID)
      const imgPath = path.join(dataDir, rel)
      const typePath = imgPath + '.type'

      let data: Buffer
      let contentType: string
      try {
        ;[data, contentType] = await Promise.all([
          fs.readFile(imgPath),
          fs.readFile(typePath, 'utf8'),
        ])
      } catch {
        return next(new NotFoundError('Avatar not found'))
      }

      res.setHeader('Content-Type', contentType.trim())
      res.setHeader('Cache-Control', 'public, max-age=60')
      res.send(data)
    } catch (err) {
      next(err)
    }
  })

  /** POST /avatar/:userID — authenticated; userID must match the caller */
  router.post(
    '/avatar/:userID',
    checkAuth,
    express.raw({ type: 'image/*', limit: MAX_AVATAR_BYTES }),
    async (req, res, next) => {
      try {
        if (req.user?.userID !== req.params.userID) {
          res.status(403).json({ message: 'Forbidden' })
          return
        }

        const contentType = req.headers['content-type'] ?? ''
        if (!validateImageMime(contentType.split(';')[0]!.trim())) {
          res.status(415).json({ message: 'Unsupported image type' })
          return
        }

        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          res.status(400).json({ message: 'Empty body' })
          return
        }

        const rel = getAvatarPath(req.params.userID)
        const imgPath = path.join(dataDir, rel)
        await fs.mkdir(path.dirname(imgPath), { recursive: true })
        await Promise.all([
          fs.writeFile(imgPath, req.body as Buffer),
          fs.writeFile(imgPath + '.type', contentType),
        ])

        res.json({ ok: true })
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
