import { Request, Response, NextFunction } from "express";
import { ApiError, errorResponse } from "../utils/response";
import { logger } from "../utils/logger";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Handle known API errors
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json(
      errorResponse(error.message, error.statusCode, error.details)
    );
  }

  // Handle specific database errors
  if (error.message.includes('unique constraint')) {
    return res.status(409).json(
      errorResponse("Resource already exists", 409)
    );
  }

  if (error.message.includes('foreign key constraint')) {
    return res.status(400).json(
      errorResponse("Invalid reference to related resource", 400)
    );
  }

  // Handle validation errors from Drizzle
  if (error.message.includes('violates check constraint')) {
    return res.status(400).json(
      errorResponse("Data validation failed", 400)
    );
  }

  // Default to 500 server error
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? error.message : "Internal server error";
  const details = isDevelopment ? { stack: error.stack } : undefined;

  return res.status(500).json(
    errorResponse(message, 500, details)
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(
    errorResponse(`Route ${req.method} ${req.url} not found`, 404)
  );
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
