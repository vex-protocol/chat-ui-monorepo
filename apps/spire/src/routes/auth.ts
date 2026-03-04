import { registry } from '#openapi'
import { Router } from 'express'
import { z } from 'zod'
import { decodeJwt } from 'jose'
import { parse as uuidParse, stringify as uuidStringify } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import {
  registerUser,
  loginUser,
  issueJWT,
  verifyNaClSignature,
  decodeHex,
  RegistrationPayloadSchema,
  LoginBodySchema,
  JWTPayloadSchema,
  ALL_TOKEN_TYPES,
  type ITokenStore,
  type TokenType,
} from '#auth/auth.service.js'
import { validateBody } from '#middleware/validate.js'
import { checkAuth } from '#middleware/checkAuth.js'
import { AuthError, ValidationError } from '#errors'

const VALID_TOKEN_TYPES = new Set<TokenType>(ALL_TOKEN_TYPES)

function setAuthCookie(res: import('express').Response, token: string): void {
  // No sameSite: tough-cookie (supertest) won't send SameSite=Lax cookies on POST requests
  res.cookie('token', token, { httpOnly: true, path: '/' })
}

export function createAuthRouter(db: Kysely<Database>, tokenStore: ITokenStore): Router {
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
      const jwt = await issueJWT(user)
      setAuthCookie(res, jwt)
      res.json({ token: jwt, ...user })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth', validateBody(LoginBodySchema), async (req, res, next) => {
    try {
      const jwt = await loginUser(db, req.body.username, req.body.password)
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

// ---------------------------------------------------------------------------
// OpenAPI registrations
// ---------------------------------------------------------------------------

const auth = [{ bearerAuth: [] }]

registry.registerPath({ method: 'post', path: '/register',    operationId: 'register',    responses: { 200: { description: 'User created' }, 409: { description: 'Username taken' } } })
registry.registerPath({ method: 'post', path: '/auth',        operationId: 'login',       responses: { 200: { description: 'JWT issued' }, 401: { description: 'Invalid credentials' } } })
registry.registerPath({ method: 'post', path: '/whoami',      operationId: 'whoami',      security: auth, responses: { 200: { description: 'Authenticated user' }, 401: { description: 'Unauthorized' } } })
registry.registerPath({ method: 'post', path: '/goodbye',     operationId: 'logout',      responses: { 200: { description: 'Cookie cleared' } } })
registry.registerPath({ method: 'get',  path: '/token/{tokenType}', operationId: 'getToken', security: auth, request: { params: z.object({ tokenType: z.string() }) }, responses: { 200: { description: 'Action token' }, 400: { description: 'Invalid type' }, 401: { description: 'Unauthorized' } } })
