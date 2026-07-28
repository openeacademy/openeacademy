export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode = 500,
    errors?: Array<{ field?: string; message: string }>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(errors: Array<{ field?: string; message: string }>) {
    super('Validation failed', 422, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
