import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log all errors
  logger.error(`${req.method} ${req.path} - ${err.message}`, { stack: err.stack });

  // Operational (known) errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
        field: (err.meta?.target as string[])?.join(', '),
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  // Multer errors
  if (err.name === 'MulterError') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // Unknown errors — hide details in production
  res.status(500).json({
    success: false,
    message: config.env === 'production' ? 'Internal server error' : err.message,
    ...(config.env !== 'production' && { stack: err.stack }),
  });
}
