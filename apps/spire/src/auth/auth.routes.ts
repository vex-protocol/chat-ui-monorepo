import { Router } from 'express'
import { stringify as uuidStringify } from 'uuid'
import { decodeJwt } from 'jose'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { registerUser, loginUser } from '#auth/auth.service.ts'
import { verifyNaClSignature, decodeHex } from '#auth/auth.crypto.ts'
import {
  RegistrationPayloadSchema,
  LoginBodySchema,
  JWTPayloadSchema,
} from '#auth/auth.schemas.ts'
import {
  ALL_TOKEN_TYPES,
  type ITokenStore,
  type TokenType,
} from '#auth/auth.token-store.ts'
import { issueJWT } from '#auth/auth.jwt.ts'
import { validateBody } from '#middleware/validate.ts'
import { createCheckAuth } from '#middleware/checkAuth.ts'
import type { RequestHandler } from 'express'
import { AuthError, ValidationError } from '#errors'

const VALID_TOKEN_TYPES = new Set<TokenType>(ALL_TOKEN_TYPES)

function setAuthCookie(res: import('express').Response, token: string): void {
  // No sameSite: tough-cookie (supertest) won't send SameSite=Lax cookies on POST requests
  res.cookie('token', token, { httpOnly: true, path: '/' })
}

export function createAuthRouter(db: Kysely<Database>, tokenStore: ITokenStore, jwtSecret: string): Router {
  const checkAuth: RequestHandler = createCheckAuth(jwtSecret)
  const router = Router()

  router.post('/register', validateBody(RegistrationPayloadSchema), async (req, res, next) => {
    try {
      const signedBytes = decodeHex(req.body.signed)
      const signKeyBytes = decodeHex(req.body.signKey)
      const regKey = verifyNaClSignature(signedBytes, signKeyBytes)
      if (!regKey) return next(new ValidationError('Invalid NaCl signature'))

      const tokenID = uuidStringify(regKey as Uint8Array)
      if (!tokenStore.validate(tokenID, 'register')) {
        return next(new ValidationError('Invalid or expired registration token'))
      }

      const user = await registerUser(db, regKey as Uint8Array, req.body)
      const jwt = await issueJWT(user, jwtSecret)
      setAuthCookie(res, jwt)
      res.json({ token: jwt, ...user })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth', validateBody(LoginBodySchema), async (req, res, next) => {
    try {
      const jwt = await loginUser(db, req.body.username, req.body.password, jwtSecret)
      if (!jwt) return next(new AuthError('Invalid credentials'))

      setAuthCookie(res, jwt)
      const { user } = JWTPayloadSchema.parse(decodeJwt(jwt))
      res.json({ token: jwt, ...user })
    } catch (err) {
      next(err)
    }
  })

  router.post('/whoami', checkAuth, (req, res) => {
    res.json(req.user)
  })

  router.post('/goodbye', (_req, res) => {
    res.clearCookie('token', { path: '/' }).json({ ok: true })
  })

  router.get('/token/:tokenType', checkAuth, (req, res, next) => {
    const type = req.params.tokenType
    if (!VALID_TOKEN_TYPES.has(type)) {
      return next(new ValidationError(`Invalid token type: ${type}`))
    }
    const token = tokenStore.create(type as TokenType)
    res.json({ key: token.key, scope: token.scope })
  })

  return router
}
