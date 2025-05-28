import winston from "winston";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    if (isDevelopment) {
      // Pretty format for development
      let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        logMessage += `\n${JSON.stringify(meta, null, 2)}`;
      }
      return logMessage;
    }
    
    // Structured JSON for production
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

// Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    level: isDevelopment ? 'debug' : 'info',
    format: customFormat
  })
];

// Add file transport for production
if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: customFormat,
  defaultMeta: {
    service: 'marketing-kpi-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
if (isProduction) {
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: 'logs/exceptions.log',
      maxsize: 5242880,
      maxFiles: 3
    })
  );

  logger.rejections.handle(
    new winston.transports.File({ 
      filename: 'logs/rejections.log',
      maxsize: 5242880,
      maxFiles: 3
    })
  );
}

// Create a stream object for morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.info(message.trim(), { context: 'http' });
  }
};

// Utility functions for common logging patterns
export const logApiRequest = (req: any, duration?: number) => {
  logger.info('API Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    duration: duration ? `${duration}ms` : undefined
  });
};

export const logApiError = (error: Error, req: any) => {
  logger.error('API Error', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
};

export const logDatabaseQuery = (query: string, duration?: number) => {
  if (isDevelopment) {
    logger.debug('Database Query', {
      query,
      duration: duration ? `${duration}ms` : undefined
    });
  }
};

export const logBusinessEvent = (event: string, data: any = {}) => {
  logger.info('Business Event', {
    event,
    ...data
  });
};

export const logSecurityEvent = (event: string, data: any = {}) => {
  logger.warn('Security Event', {
    event,
    ...data
  });
};

// Export default logger
export default logger;
