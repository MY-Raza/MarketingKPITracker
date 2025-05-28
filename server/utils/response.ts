// Standardized API response formats
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiErrorResponse;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: any[];
  timestamp: string;
  requestId?: string;
}

export interface ResponseMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any[];

  constructor(message: string, statusCode: number = 500, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = this.generateErrorCode(statusCode);
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  private generateErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      case 500: return 'INTERNAL_SERVER_ERROR';
      case 502: return 'BAD_GATEWAY';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'UNKNOWN_ERROR';
    }
  }
}

// Success response helper
export const successResponse = <T>(
  data: T, 
  message?: string, 
  meta?: ResponseMeta
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    meta
  };
};

// Error response helper
export const errorResponse = (
  message: string,
  statusCode: number = 500,
  details?: any[]
): ApiResponse => {
  const error = new ApiError(message, statusCode, details);
  
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

// Paginated response helper
export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): ApiResponse<T[]> => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    message,
    meta: {
      total,
      page,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// HTTP status code constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  ACCESS_DENIED: 'Access denied',
  RESOURCE_NOT_FOUND: 'Resource not found',
  VALIDATION_FAILED: 'Validation failed',
  DUPLICATE_RESOURCE: 'Resource already exists',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
} as const;

// Validation error helper
export const validationErrorResponse = (errors: any[]): ApiResponse => {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    }
  };
};

// Rate limit error helper
export const rateLimitErrorResponse = (retryAfter?: number): ApiResponse => {
  return {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      details: retryAfter ? [{ retryAfter }] : undefined,
      timestamp: new Date().toISOString()
    }
  };
};

// Not found error helper
export const notFoundErrorResponse = (resource: string = 'Resource'): ApiResponse => {
  return {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      timestamp: new Date().toISOString()
    }
  };
};

// Unauthorized error helper
export const unauthorizedErrorResponse = (message: string = 'Authentication required'): ApiResponse => {
  return {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message,
      timestamp: new Date().toISOString()
    }
  };
};

// Forbidden error helper
export const forbiddenErrorResponse = (message: string = 'Insufficient permissions'): ApiResponse => {
  return {
    success: false,
    error: {
      code: 'FORBIDDEN',
      message,
      timestamp: new Date().toISOString()
    }
  };
};

export default {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  rateLimitErrorResponse,
  notFoundErrorResponse,
  unauthorizedErrorResponse,
  forbiddenErrorResponse,
  ApiError,
  HTTP_STATUS,
  ERROR_MESSAGES
};
