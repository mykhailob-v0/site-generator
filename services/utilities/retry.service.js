const BaseService = require('../base/base.service');

/**
 * Retry Service
 * Provides advanced retry logic with exponential backoff, jitter, and circuit breaker patterns
 * Production-ready retry mechanisms for API calls and operations
 */
class RetryService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second base delay
      maxDelay: 30000, // 30 seconds max delay
      exponentialBase: 2,
      jitter: true,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5, // failures before opening circuit
      circuitBreakerTimeout: 60000, // 1 minute timeout
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'],
      ...config
    };

    this.circuitBreakers = new Map();
    this.retryStats = {
      totalAttempts: 0,
      totalRetries: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      circuitBreakerTrips: 0
    };
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {object} options - Retry options
   * @returns {Promise<any>} - Operation result
   */
  async executeWithRetry(operation, options = {}) {
    const config = { ...this.config, ...options };
    const operationId = options.operationId || 'default';
    
    this.logOperation('Starting retry execution', { 
      operationId,
      maxRetries: config.maxRetries,
      circuitBreakerEnabled: config.circuitBreakerEnabled
    });

    // Check circuit breaker
    if (config.circuitBreakerEnabled && this.isCircuitOpen(operationId)) {
      const error = new Error(`Circuit breaker open for operation: ${operationId}`);
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }

    let lastError;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      this.retryStats.totalAttempts++;
      
      try {
        this.logOperation('Executing attempt', { 
          operationId, 
          attempt: attempt + 1, 
          maxRetries: config.maxRetries + 1 
        });

        const result = await this.executeWithTimeout(operation, config.timeout);
        
        this.retryStats.totalSuccesses++;
        this.recordSuccess(operationId);

        this.logOperation('Operation succeeded', { 
          operationId, 
          attempt: attempt + 1,
          totalRetries: attempt
        });

        return result;

      } catch (error) {
        lastError = error;
        attempt++;

        this.logError('Operation attempt failed', error, { 
          operationId, 
          attempt, 
          willRetry: attempt <= config.maxRetries && this.isRetryableError(error, config)
        });

        this.recordFailure(operationId, error);

        // Check if we should retry
        if (attempt > config.maxRetries || !this.isRetryableError(error, config)) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        
        this.logOperation('Waiting before retry', { 
          operationId, 
          delay, 
          nextAttempt: attempt + 1 
        });

        this.retryStats.totalRetries++;
        await this.sleep(delay);
      }
    }

    this.retryStats.totalFailures++;
    
    this.logError('Operation failed after all retries', lastError, { 
      operationId, 
      totalAttempts: attempt,
      maxRetries: config.maxRetries
    });

    throw lastError;
  }

  /**
   * Execute operation with timeout
   * @param {Function} operation - Operation to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<any>} - Operation result
   */
  async executeWithTimeout(operation, timeout) {
    if (!timeout) {
      return await operation();
    }

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new Error(`Operation timed out after ${timeout}ms`);
        error.code = 'TIMEOUT';
        reject(error);
      }, timeout);

      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Calculate delay for next retry with exponential backoff
   * @param {number} attempt - Current attempt number
   * @param {object} config - Retry configuration
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(attempt, config) {
    // Exponential backoff: baseDelay * (exponentialBase ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1);
    
    // Cap at maxDelay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.round(Math.max(delay, 0));
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @param {object} config - Retry configuration
   * @returns {boolean} - True if error is retryable
   */
  isRetryableError(error, config) {
    // Check error codes
    if (error.code && config.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check HTTP status codes
    if (error.response && error.response.status) {
      const status = error.response.status;
      // Retry on 5xx server errors and some 4xx errors
      if (status >= 500 || status === 429 || status === 408) {
        return true;
      }
    }

    // Check for network errors
    if (error.message) {
      const networkErrors = ['network', 'timeout', 'connect', 'dns'];
      if (networkErrors.some(keyword => error.message.toLowerCase().includes(keyword))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if circuit breaker is open for operation
   * @param {string} operationId - Operation identifier
   * @returns {boolean} - True if circuit is open
   */
  isCircuitOpen(operationId) {
    const circuit = this.circuitBreakers.get(operationId);
    
    if (!circuit || circuit.state === 'closed') {
      return false;
    }

    if (circuit.state === 'open') {
      // Check if timeout has passed
      if (Date.now() - circuit.openedAt > this.config.circuitBreakerTimeout) {
        // Transition to half-open
        circuit.state = 'half-open';
        this.logOperation('Circuit breaker half-open', { operationId });
        return false;
      }
      return true;
    }

    // half-open state - allow one attempt
    return false;
  }

  /**
   * Record successful operation
   * @param {string} operationId - Operation identifier
   */
  recordSuccess(operationId) {
    const circuit = this.circuitBreakers.get(operationId);
    
    if (circuit) {
      if (circuit.state === 'half-open') {
        // Close the circuit on success
        circuit.state = 'closed';
        circuit.failures = 0;
        this.logOperation('Circuit breaker closed', { operationId });
      } else {
        circuit.failures = Math.max(0, circuit.failures - 1);
      }
    }
  }

  /**
   * Record failed operation
   * @param {string} operationId - Operation identifier
   * @param {Error} error - Error that occurred
   */
  recordFailure(operationId, error) {
    if (!this.config.circuitBreakerEnabled) {
      return;
    }

    let circuit = this.circuitBreakers.get(operationId);
    
    if (!circuit) {
      circuit = {
        state: 'closed',
        failures: 0,
        openedAt: null
      };
      this.circuitBreakers.set(operationId, circuit);
    }

    circuit.failures++;

    // Open circuit if threshold exceeded
    if (circuit.failures >= this.config.circuitBreakerThreshold && circuit.state === 'closed') {
      circuit.state = 'open';
      circuit.openedAt = Date.now();
      this.retryStats.circuitBreakerTrips++;
      
      this.logOperation('Circuit breaker opened', { 
        operationId, 
        failures: circuit.failures, 
        threshold: this.config.circuitBreakerThreshold 
      });
    }

    // If half-open and failed, reopen circuit
    if (circuit.state === 'half-open') {
      circuit.state = 'open';
      circuit.openedAt = Date.now();
      
      this.logOperation('Circuit breaker reopened', { operationId });
    }
  }

  /**
   * Manually reset circuit breaker
   * @param {string} operationId - Operation identifier
   */
  resetCircuitBreaker(operationId) {
    const circuit = this.circuitBreakers.get(operationId);
    
    if (circuit) {
      circuit.state = 'closed';
      circuit.failures = 0;
      circuit.openedAt = null;
      
      this.logOperation('Circuit breaker manually reset', { operationId });
    }
  }

  /**
   * Get circuit breaker status
   * @param {string} operationId - Operation identifier
   * @returns {object} - Circuit breaker status
   */
  getCircuitBreakerStatus(operationId) {
    const circuit = this.circuitBreakers.get(operationId);
    
    if (!circuit) {
      return { state: 'closed', failures: 0, openedAt: null };
    }

    return { ...circuit };
  }

  /**
   * Execute multiple operations with retry (parallel)
   * @param {Array} operations - Array of operations to execute
   * @param {object} options - Retry options
   * @returns {Promise<Array>} - Results array
   */
  async executeAllWithRetry(operations, options = {}) {
    this.logOperation('Executing multiple operations with retry', { 
      operationCount: operations.length 
    });

    const results = await Promise.allSettled(
      operations.map((operation, index) => 
        this.executeWithRetry(operation, {
          ...options,
          operationId: options.operationId ? `${options.operationId}-${index}` : `parallel-${index}`
        })
      )
    );

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;

    this.logOperation('Multiple operations completed', { 
      total: operations.length, 
      successes, 
      failures 
    });

    return results;
  }

  /**
   * Execute operations with retry (sequential)
   * @param {Array} operations - Array of operations to execute
   * @param {object} options - Retry options
   * @returns {Promise<Array>} - Results array
   */
  async executeSequentialWithRetry(operations, options = {}) {
    this.logOperation('Executing operations sequentially with retry', { 
      operationCount: operations.length 
    });

    const results = [];
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await this.executeWithRetry(operations[i], {
          ...options,
          operationId: options.operationId ? `${options.operationId}-${i}` : `sequential-${i}`
        });
        
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
        
        // Stop on first failure if configured
        if (options.stopOnFirstFailure) {
          break;
        }
      }
    }

    const successes = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected').length;

    this.logOperation('Sequential operations completed', { 
      total: operations.length, 
      successes, 
      failures 
    });

    return results;
  }

  /**
   * Get retry statistics
   * @returns {object} - Current retry statistics
   */
  getRetryStats() {
    const stats = { ...this.retryStats };
    
    stats.successRate = stats.totalAttempts > 0 
      ? Math.round((stats.totalSuccesses / stats.totalAttempts) * 100)
      : 0;
      
    stats.retryRate = stats.totalAttempts > 0
      ? Math.round((stats.totalRetries / stats.totalAttempts) * 100)
      : 0;

    return stats;
  }

  /**
   * Get all circuit breaker statuses
   * @returns {object} - All circuit breaker statuses
   */
  getAllCircuitBreakerStatuses() {
    const statuses = {};
    
    for (const [operationId, circuit] of this.circuitBreakers) {
      statuses[operationId] = { ...circuit };
    }

    return statuses;
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.retryStats = {
      totalAttempts: 0,
      totalRetries: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      circuitBreakerTrips: 0
    };

    this.logOperation('Retry statistics reset');
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers() {
    const count = this.circuitBreakers.size;
    this.circuitBreakers.clear();
    
    this.logOperation('All circuit breakers reset', { count });
  }
}

module.exports = RetryService;
