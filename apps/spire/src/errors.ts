/**
 * Domain error classes for apps/spire.
 *
 * Service functions throw these; Express error middleware maps them to HTTP status codes.
 * Route handlers never inspect error.message strings — they use instanceof checks.
 */

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(message = 'Conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400
  constructor(message = 'Validation failed') {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class AuthError extends Error {
  readonly statusCode = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends Error {
  readonly statusCode = 403
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}
