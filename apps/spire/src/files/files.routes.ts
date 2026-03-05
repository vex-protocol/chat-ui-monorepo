import express, { Router } from 'express'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { RequestHandler } from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { createFile, getFile, getFilePath } from '#files/files.service.ts'
import { NotFoundError } from '#errors'

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB

export function createFileRouter(db: Kysely<Database>, dataDir: string, checkAuth: RequestHandler): Router {
  const router = Router()

  /** POST /file — upload a file (raw body, any content type) */
  router.post(
    '/file',
    checkAuth,
    express.raw({ type: '*/*', limit: MAX_FILE_BYTES }),
    async (req, res, next) => {
      try {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          res.status(400).json({ message: 'Empty body' })
          return
        }

        const contentType = req.headers['content-type'] ?? 'application/octet-stream'
        const nonce = (req.headers['x-file-nonce'] as string) ?? ''

        const file = await createFile(db, req.user!.userID, nonce)
        const filePath = path.join(dataDir, getFilePath(file.fileID))
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await Promise.all([
          fs.writeFile(filePath, req.body as Buffer),
          fs.writeFile(filePath + '.type', contentType),
        ])

        res.json({ fileID: file.fileID, nonce: file.nonce })
      } catch (err) {
        next(err)
      }
    },
  )

  /** GET /file/:id — download a file */
  router.get('/file/:id', checkAuth, async (req, res, next) => {
    try {
      const file = await getFile(db, req.params.id)
      if (!file) return next(new NotFoundError('File not found'))

      const filePath = path.join(dataDir, getFilePath(file.fileID))
      const typePath = filePath + '.type'

      let data: Buffer
      let contentType: string
      try {
        ;[data, contentType] = await Promise.all([
          fs.readFile(filePath),
          fs.readFile(typePath, 'utf8'),
        ])
      } catch {
        return next(new NotFoundError('File not found'))
      }

      res.setHeader('Content-Type', contentType.trim())
      res.setHeader('X-File-Nonce', file.nonce)
      res.send(data)
    } catch (err) {
      next(err)
    }
  })

  return router
}
