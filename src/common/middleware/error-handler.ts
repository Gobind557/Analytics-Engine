import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../errors/api-error';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Validation failed',
      details: error.flatten()
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message,
    details: null
  });
}
