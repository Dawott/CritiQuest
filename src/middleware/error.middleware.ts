import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getErrorMessage } from '../utils/error.utils';

// Define error types for better categorization
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  FIREBASE = 'FIREBASE',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL',
}

// Custom error class for better error handling
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.INTERNAL,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = isOperational;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Helper function to determine error type from error object
function determineErrorType(error: any): ErrorType {
  if (error instanceof z.ZodError) return ErrorType.VALIDATION;
  if (error.code === 'auth/id-token-expired') return ErrorType.AUTHENTICATION;
  if (error.code === 'auth/invalid-token') return ErrorType.AUTHENTICATION;
  if (error.code === 'auth/user-not-found') return ErrorType.AUTHENTICATION;
  if (error.code === 'PERMISSION_DENIED') return ErrorType.AUTHORIZATION;
  if (error.code === 'NETWORK_ERROR') return ErrorType.FIREBASE;
  if (error.statusCode === 429) return ErrorType.RATE_LIMIT;
  if (error.statusCode === 404) return ErrorType.NOT_FOUND;
  
  return ErrorType.INTERNAL;
}

// Helper function to get appropriate status code
function getStatusCode(error: any, errorType: ErrorType): number {
  if (error.statusCode) return error.statusCode;
  
  switch (errorType) {
    case ErrorType.VALIDATION:
      return 400;
    case ErrorType.AUTHENTICATION:
      return 401;
    case ErrorType.AUTHORIZATION:
      return 403;
    case ErrorType.NOT_FOUND:
      return 404;
    case ErrorType.RATE_LIMIT:
      return 429;
    case ErrorType.FIREBASE:
      return 503;
    default:
      return 500;
  }
}

// Helper function to get user-friendly error messages in Polish
function getUserFriendlyMessage(errorType: ErrorType, originalMessage?: string): string {
  switch (errorType) {
    case ErrorType.VALIDATION:
      return 'Dane wejściowe są nieprawidłowe';
    case ErrorType.AUTHENTICATION:
      return 'Wymagane uwierzytelnienie';
    case ErrorType.AUTHORIZATION:
      return 'Brak uprawnień do wykonania tej operacji';
    case ErrorType.NOT_FOUND:
      return 'Zasób nie został znaleziony';
    case ErrorType.RATE_LIMIT:
      return 'Przekroczono limit zapytań. Spróbuj ponownie później';
    case ErrorType.FIREBASE:
      return 'Usługa tymczasowo niedostępna';
    default:
      return originalMessage || 'Wystąpił nieoczekiwany błąd';
  }
}

// Main error handler middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error for debugging
  console.error('Error caught by middleware:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userId: (req as any).userId || 'anonymous',
    userAgent: req.get('User-Agent'),
  });

  // Handle AppError instances
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      type: error.type,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
    return;
  }

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: 'Błędy walidacji',
      type: ErrorType.VALIDATION,
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
    return;
  }

  // Handle Firebase errors
  if (error.code && error.code.startsWith('auth/')) {
    res.status(401).json({
      success: false,
      error: 'Błąd uwierzytelnienia',
      type: ErrorType.AUTHENTICATION,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && { 
        message: error.message,
        stack: error.stack 
      }),
    });
    return;
  }

  // Handle other known error patterns
  const errorType = determineErrorType(error);
  const statusCode = getStatusCode(error, errorType);
  const userMessage = getUserFriendlyMessage(errorType, error.message);

  // Prepare response
  const errorResponse: any = {
    success: false,
    error: userMessage,
    type: errorType,
  };

  // Add development details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.originalMessage = getErrorMessage(error);
    errorResponse.stack = error.stack;
  }

  // Add specific error details for certain types
  if (error.code) {
    errorResponse.code = error.code;
  }

  if (error.retryAfter) {
    errorResponse.retryAfter = error.retryAfter;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(
    `Endpoint ${req.originalUrl} nie został znaleziony`,
    404,
    ErrorType.NOT_FOUND
  );
  next(error);
};

// Unhandled promise rejection handler
export const setupGlobalErrorHandlers = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Promise Rejection:', reason);
    // In production, you might want to gracefully shut down
    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down due to unhandled promise rejection');
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    // Gracefully shut down
    process.exit(1);
  });
};

// Helper functions for creating specific errors
export const createValidationError = (message: string, details?: any) => 
  new AppError(message, 400, ErrorType.VALIDATION, true, details);

export const createAuthError = (message: string = 'Token błędny') => 
  new AppError(message, 401, ErrorType.AUTHENTICATION);

export const createForbiddenError = (message: string = 'Brak uprawnień') => 
  new AppError(message, 403, ErrorType.AUTHORIZATION);

export const createNotFoundError = (message: string = 'Zasób nie został znaleziony') => 
  new AppError(message, 404, ErrorType.NOT_FOUND);

export const createFirebaseError = (message: string = 'Błąd bazy danych') => 
  new AppError(message, 503, ErrorType.FIREBASE);