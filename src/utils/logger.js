const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// File format for structured logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'html-generator',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Console output
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info'
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Create request ID for tracing
let requestCounter = 0;
const generateRequestId = () => {
  return `req_${Date.now()}_${++requestCounter}`;
};

// Enhanced logging methods
const enhancedLogger = Object.assign(logger, {
  // Request logging
  logRequest(requestId, operation, params = {}) {
    logger.info('Request started', {
      requestId,
      operation,
      params: this.sanitizeParams(params)
    });
  },
  
  logResponse(requestId, operation, result = {}, duration) {
    logger.info('Request completed', {
      requestId,
      operation,
      duration: `${duration}ms`,
      success: true,
      resultSize: JSON.stringify(result).length
    });
  },
  
  logError(requestId, operation, error, params = {}) {
    logger.error('Request failed', {
      requestId,
      operation,
      error: error.message,
      stack: error.stack,
      params: this.sanitizeParams(params)
    });
  },
  
  // API call logging
  logApiCall(requestId, service, model, tokenUsage = null) {
    logger.info('API call made', {
      requestId,
      service,
      model,
      tokenUsage
    });
  },
  
  // Performance logging
  logPerformance(requestId, operation, metrics) {
    logger.info('Performance metrics', {
      requestId,
      operation,
      ...metrics
    });
  },
  
  // Sanitize sensitive data
  sanitizeParams(params) {
    const sanitized = { ...params };
    
    // Remove or mask sensitive fields
    if (sanitized.apiKey) {
      sanitized.apiKey = `${sanitized.apiKey.substring(0, 7)}...`;
    }
    
    // Truncate long content
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = `${sanitized[key].substring(0, 1000)}...`;
      }
    });
    
    return sanitized;
  },
  
  // Generate request ID
  generateRequestId
});

module.exports = enhancedLogger;
