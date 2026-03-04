import type { RequestHandler } from 'express'
import { z } from 'zod'
import { ValidationError } from '#errors'

export function validateBody<T>(schema: z.ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return next(new ValidationError(result.error.message))
    req.body = result.data
    next()
  }
}

export function validateParams<T>(schema: z.ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) return next(new ValidationError(result.error.message))
    next()
  }
}
