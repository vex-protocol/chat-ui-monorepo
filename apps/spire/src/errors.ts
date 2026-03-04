/**
 * Domain error classes for apps/spire.
 *
 * Service functions throw these; Express error middleware reads statusCode from AppError
 * to set the HTTP status without a parallel instanceof chain.
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number
}

export class ConflictError extends AppError {
  readonly statusCode = 409
  constructor(message = 'Conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class AuthError extends AppError {
  readonly statusCode = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}
