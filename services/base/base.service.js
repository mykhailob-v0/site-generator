/**
 * BaseService Class
 * Provides common functionality for all services including logging, error handling, and metrics
 */

const logger = require('../../src/utils/logger');
const { logLevelManager } = require('../../src/utils/log-levels');
const ErrorUtils = require('../../src/utils/errors');

class BaseService {
  constructor(config = {}) {
    this.config = config;
    this.serviceName = this.constructor.name;
    this.metrics = {
      calls: 0,
      errors: 0,
      totalDuration: 0
    };
    this.startTime = Date.now();
    
    this.log(`${this.serviceName} initialized`);
  }

  /**
   * Log message with service context (respects log level settings)
   */
  log(message, level = 'info', data = {}) {
    // Check if this log level should be shown
    if (!logLevelManager.shouldLog(level)) {
      return;
    }

    const logData = {
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      ...data
    };

    logger[level](message, logData);
  }

  /**
   * Log error with proper handling
   */
  logError(error, context = {}) {
    this.metrics.errors++;
    
    const errorData = {
      service: this.serviceName,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      context
    };

    logger.error(`${this.serviceName} error: ${error?.message || 'Unknown error'}`, errorData);
  }

  /**
   * Log performance metrics (only if performance logging is enabled)
   */
  logPerformance(operation, duration, metadata = {}) {
    this.metrics.calls++;
    this.metrics.totalDuration += duration;

    // Only log performance details if the current level allows it
    if (logLevelManager.shouldLogPerformance()) {
      this.log(`${operation} completed in ${duration}ms`, 'verbose', {
        operation,
        duration,
        averageDuration: Math.round(this.metrics.totalDuration / this.metrics.calls),
        ...metadata
      });
    }
  }

  /**
   * Execute operation with error handling and metrics
   */
  async executeWithMetrics(operation, operationName) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.logPerformance(operationName, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError(error, { operation: operationName, duration });
      throw error;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    return {
      serviceName: this.serviceName,
      calls: this.metrics.calls,
      errors: this.metrics.errors,
      totalDuration: this.metrics.totalDuration,
      averageDuration: this.metrics.calls > 0 ? Math.round(this.metrics.totalDuration / this.metrics.calls) : 0,
      errorRate: this.metrics.calls > 0 ? Math.round((this.metrics.errors / this.metrics.calls) * 100) : 0,
      uptime
    };
  }

  /**
   * Validate input parameters
   */
  validateInput(input, rules = {}) {
    if (!input || typeof input !== 'object') {
      throw new ErrorUtils.ValidationError('Input must be a valid object');
    }

    // Check required fields
    if (rules.required) {
      const missing = rules.required.filter(field => !input[field]);
      if (missing.length > 0) {
        throw new ErrorUtils.ValidationError(`Missing required fields: ${missing.join(', ')}`);
      }
    }

    return true;
  }

  /**
   * Validate required fields (alternative method name)
   */
  validateRequired(input, requiredFields = []) {
    if (!input || typeof input !== 'object') {
      throw new ErrorUtils.ValidationError('Input must be a valid object');
    }

    const missing = requiredFields.filter(field => !input[field]);
    if (missing.length > 0) {
      throw new ErrorUtils.ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * Create standardized service response
   */
  createResponse(success, data = null, error = null, metadata = {}) {
    return {
      success,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      data,
      error: error?.message || error,
      metadata: {
        ...this.getMetrics(),
        ...metadata
      }
    };
  }

  /**
   * Handle async operations with retry logic
   */
  async retry(operation, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.log(`Attempt ${attempt} failed: ${error.message}`, 'warn', { attempt, maxAttempts });
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set request ID for tracking
   */
  setRequestId(requestId) {
    this.currentRequestId = requestId;
    return this; // Enable method chaining
  }

  /**
   * Log operation with context (only if operation logging is enabled)
   */
  logOperation(operation, data = {}) {
    if (logLevelManager.shouldLogOperations()) {
      this.log(`Operation: ${operation}`, 'info', {
        operation,
        requestId: this.currentRequestId,
        ...data
      });
    }
  }

  /**
   * Execute operation with retry logic and error handling
   */
  async executeWithRetry(operation, operationName, maxAttempts = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logOperation(`Starting ${operationName} (attempt ${attempt})`);
        const startTime = Date.now();
        
        const result = await operation();
        
        const duration = Date.now() - startTime;
        this.logPerformance(operationName, duration);
        
        return result;
      } catch (error) {
        lastError = error;
        
        this.logError(error, { 
          operation: operationName, 
          attempt, 
          maxAttempts,
          requestId: this.currentRequestId 
        });
        
        if (attempt < maxAttempts) {
          const waitTime = delay * attempt;
          this.log(`Retrying ${operationName} in ${waitTime}ms...`, 'warn', { 
            attempt, 
            maxAttempts, 
            waitTime 
          });
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          this.log(`${operationName} failed after ${maxAttempts} attempts`, 'error', {
            finalError: error.message,
            totalAttempts: maxAttempts
          });
        }
      }
    }
    
    throw lastError;
  }
}

module.exports = BaseService;