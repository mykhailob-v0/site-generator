/**
 * Log Level Manager for HTML Generator
 * Controls what types of logs are shown based on user preference
 */

const LOG_LEVELS = {
  minimal: {
    priority: 0,
    description: 'Only show errors and critical warnings',
    allowedTypes: ['error', 'warn']
  },
  standard: {
    priority: 1,
    description: 'Show errors, warnings and key operation info',
    allowedTypes: ['error', 'warn', 'info']
  },
  detailed: {
    priority: 2,
    description: 'Show all operations with timing and metrics',
    allowedTypes: ['error', 'warn', 'info', 'verbose']
  },
  debug: {
    priority: 3,
    description: 'Show everything including debug traces',
    allowedTypes: ['error', 'warn', 'info', 'verbose', 'debug']
  }
};

class LogLevelManager {
  constructor() {
    this.currentLevel = 'minimal'; // Default to minimal for better UX
  }

  /**
   * Set the current log level
   * @param {string} level - Log level: minimal, standard, detailed, debug
   */
  setLevel(level) {
    if (!LOG_LEVELS[level]) {
      throw new Error(`Invalid log level: ${level}. Valid levels: ${Object.keys(LOG_LEVELS).join(', ')}`);
    }
    this.currentLevel = level;
  }

  /**
   * Get the current log level
   * @returns {string}
   */
  getLevel() {
    return this.currentLevel;
  }

  /**
   * Check if a log type should be shown at current level
   * @param {string} logType - Winston log level (error, warn, info, verbose, debug)
   * @returns {boolean}
   */
  shouldLog(logType) {
    const currentConfig = LOG_LEVELS[this.currentLevel];
    return currentConfig.allowedTypes.includes(logType);
  }

  /**
   * Check if operation logging should be shown
   * @returns {boolean}
   */
  shouldLogOperations() {
    return this.shouldLog('info');
  }

  /**
   * Check if performance metrics should be shown
   * @returns {boolean}
   */
  shouldLogPerformance() {
    return this.shouldLog('verbose');
  }

  /**
   * Check if API calls should be logged
   * @returns {boolean}
   */
  shouldLogApiCalls() {
    return this.shouldLog('verbose');
  }

  /**
   * Check if request/response details should be logged
   * @returns {boolean}
   */
  shouldLogRequests() {
    return this.shouldLog('verbose');
  }

  /**
   * Get available log levels with descriptions
   * @returns {Object}
   */
  getAvailableLevels() {
    return Object.keys(LOG_LEVELS).map(level => ({
      name: level,
      description: LOG_LEVELS[level].description,
      priority: LOG_LEVELS[level].priority
    }));
  }

  /**
   * Format log level info for display
   * @returns {string}
   */
  getDisplayInfo() {
    const current = LOG_LEVELS[this.currentLevel];
    return `Current log level: ${this.currentLevel} (${current.description})`;
  }
}

// Export singleton instance
const logLevelManager = new LogLevelManager();

module.exports = {
  LogLevelManager,
  logLevelManager,
  LOG_LEVELS
};
