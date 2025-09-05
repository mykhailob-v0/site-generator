/**
 * Custom error classes for better error handling and debugging
 */

class BaseError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends BaseError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
    this.type = 'VALIDATION_ERROR';
  }
}

class ApiError extends BaseError {
  constructor(message, service = null, statusCode = 500) {
    super(message, statusCode);
    this.service = service;
    this.type = 'API_ERROR';
  }
}

class OpenAIError extends ApiError {
  constructor(message, model = null, statusCode = 500) {
    super(message, 'openai', statusCode);
    this.model = model;
    this.type = 'OPENAI_ERROR';
  }
}

class ConfigurationError extends BaseError {
  constructor(message, configKey = null) {
    super(message, 500);
    this.configKey = configKey;
    this.type = 'CONFIGURATION_ERROR';
  }
}

class FileSystemError extends BaseError {
  constructor(message, operation = null, filePath = null) {
    super(message, 500);
    this.operation = operation;
    this.filePath = filePath;
    this.type = 'FILESYSTEM_ERROR';
  }
}

class GenerationError extends BaseError {
  constructor(message, stage = null, requestId = null) {
    super(message, 500);
    this.stage = stage;
    this.requestId = requestId;
    this.type = 'GENERATION_ERROR';
  }
}

/**
 * Error handler for async functions
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Check if error is operational (expected) or programming error
 */
const isOperationalError = (error) => {
  return error instanceof BaseError && error.isOperational;
};

/**
 * Format error for logging
 */
const formatErrorForLog = (error, requestId = null) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
  
  if (requestId) {
    errorInfo.requestId = requestId;
  }
  
  if (error instanceof BaseError) {
    errorInfo.statusCode = error.statusCode;
    errorInfo.type = error.type;
    errorInfo.isOperational = error.isOperational;
    
    // Add specific error properties
    if (error.field) errorInfo.field = error.field;
    if (error.service) errorInfo.service = error.service;
    if (error.model) errorInfo.model = error.model;
    if (error.configKey) errorInfo.configKey = error.configKey;
    if (error.operation) errorInfo.operation = error.operation;
    if (error.filePath) errorInfo.filePath = error.filePath;
    if (error.stage) errorInfo.stage = error.stage;
  }
  
  return errorInfo;
};

/**
 * Create user-friendly error message
 */
const createUserMessage = (error) => {
  if (error instanceof ValidationError) {
    return `Invalid input${error.field ? ` for ${error.field}` : ''}: ${error.message}`;
  }
  
  if (error instanceof OpenAIError) {
    return `AI service error${error.model ? ` (${error.model})` : ''}: ${error.message}`;
  }
  
  if (error instanceof ConfigurationError) {
    return `Configuration error${error.configKey ? ` (${error.configKey})` : ''}: ${error.message}`;
  }
  
  if (error instanceof FileSystemError) {
    return `File system error${error.operation ? ` during ${error.operation}` : ''}: ${error.message}`;
  }
  
  if (error instanceof GenerationError) {
    return `Generation failed${error.stage ? ` at ${error.stage}` : ''}: ${error.message}`;
  }
  
  // Generic error message for unknown errors
  return 'An unexpected error occurred. Please check the logs for more details.';
};

module.exports = {
  BaseError,
  ValidationError,
  ApiError,
  OpenAIError,
  ConfigurationError,
  FileSystemError,
  GenerationError,
  asyncHandler,
  isOperationalError,
  formatErrorForLog,
  createUserMessage
};
