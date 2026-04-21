import { StatusCodes } from 'http-status-codes';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(StatusCodes.BAD_REQUEST, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(StatusCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(StatusCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(StatusCodes.NOT_FOUND, message);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(StatusCodes.TOO_MANY_REQUESTS, message);
  }
}
