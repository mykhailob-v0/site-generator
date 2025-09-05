const BaseService = require('../base/base.service');

/**
 * Metrics Service
 * Collects and tracks performance metrics across all services
 * Provides insights into system performance, API usage, and bottlenecks
 */
class MetricsService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      maxMetricsPerType: 1000,
      aggregationInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.metrics = {
      requests: [],
      apiCalls: [],
      performance: [],
      errors: [],
      cache: [],
      system: []
    };

    this.counters = {
      totalRequests: 0,
      totalApiCalls: 0,
      totalErrors: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0
    };

    this.aggregated = {
      requests: { hourly: [], daily: [] },
      apiCalls: { hourly: [], daily: [] },
      performance: { hourly: [], daily: [] },
      errors: { hourly: [], daily: [] }
    };

    // Start cleanup and aggregation interval
    this.startBackgroundTasks();
  }

  /**
   * Start background tasks for cleanup and aggregation
   */
  startBackgroundTasks() {
    // Cleanup old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    // Aggregate metrics every 5 minutes
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);
  }

  /**
   * Record a request metric
   * @param {object} requestData - Request data
   */
  recordRequest(requestData) {
    const metric = {
      timestamp: Date.now(),
      requestId: requestData.requestId,
      operation: requestData.operation,
      duration: requestData.duration,
      success: requestData.success,
      userAgent: requestData.userAgent,
      ip: requestData.ip
    };

    this.addMetric('requests', metric);
    this.counters.totalRequests++;
    
    this.logOperation('metric_recorded', { type: 'request', operation: requestData.operation });
  }

  /**
   * Record an API call metric
   * @param {object} apiData - API call data
   */
  recordApiCall(apiData) {
    const metric = {
      timestamp: Date.now(),
      requestId: apiData.requestId,
      service: apiData.service,
      model: apiData.model,
      duration: apiData.duration,
      tokensUsed: apiData.tokensUsed,
      cost: apiData.cost,
      success: apiData.success,
      errorType: apiData.errorType
    };

    this.addMetric('apiCalls', metric);
    this.counters.totalApiCalls++;
    
    this.logOperation('metric_recorded', { 
      type: 'apiCall', 
      service: apiData.service, 
      model: apiData.model 
    });
  }

  /**
   * Record a performance metric
   * @param {object} perfData - Performance data
   */
  recordPerformance(perfData) {
    const metric = {
      timestamp: Date.now(),
      requestId: perfData.requestId,
      operation: perfData.operation,
      phase: perfData.phase,
      duration: perfData.duration,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.addMetric('performance', metric);
    
    this.logOperation('metric_recorded', { 
      type: 'performance', 
      operation: perfData.operation,
      phase: perfData.phase
    });
  }

  /**
   * Record an error metric
   * @param {object} errorData - Error data
   */
  recordError(errorData) {
    const metric = {
      timestamp: Date.now(),
      requestId: errorData.requestId,
      service: errorData.service,
      operation: errorData.operation,
      errorType: errorData.errorType,
      errorMessage: errorData.errorMessage,
      stack: errorData.stack
    };

    this.addMetric('errors', metric);
    this.counters.totalErrors++;
    
    this.logOperation('metric_recorded', { 
      type: 'error', 
      service: errorData.service,
      errorType: errorData.errorType
    });
  }

  /**
   * Record cache metrics
   * @param {object} cacheData - Cache operation data
   */
  recordCache(cacheData) {
    const metric = {
      timestamp: Date.now(),
      operation: cacheData.operation, // hit, miss, set, delete
      key: cacheData.key,
      size: cacheData.size,
      ttl: cacheData.ttl
    };

    this.addMetric('cache', metric);
    
    if (cacheData.operation === 'hit') {
      this.counters.totalCacheHits++;
    } else if (cacheData.operation === 'miss') {
      this.counters.totalCacheMisses++;
    }
  }

  /**
   * Record system metrics
   * @param {object} systemData - System metrics data
   */
  recordSystem(systemData = {}) {
    const metric = {
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: require('os').loadavg(),
      ...systemData
    };

    this.addMetric('system', metric);
  }

  /**
   * Add metric to collection with size management
   * @param {string} type - Metric type
   * @param {object} metric - Metric data
   */
  addMetric(type, metric) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }

    this.metrics[type].push(metric);

    // Limit collection size
    if (this.metrics[type].length > this.config.maxMetricsPerType) {
      this.metrics[type] = this.metrics[type].slice(-this.config.maxMetricsPerType);
    }
  }

  /**
   * Get current metrics summary
   * @returns {object} - Metrics summary
   */
  getMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return {
      counters: { ...this.counters },
      recent: {
        lastHour: this.getMetricsInTimeRange(oneHourAgo, now),
        lastDay: this.getMetricsInTimeRange(oneDayAgo, now)
      },
      performance: this.getPerformanceStats(),
      cache: this.getCacheStats(),
      system: this.getSystemStats(),
      aggregated: this.aggregated,
      timestamp: now
    };
  }

  /**
   * Get metrics within a time range
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {object} - Filtered metrics
   */
  getMetricsInTimeRange(startTime, endTime) {
    const result = {};

    for (const [type, metrics] of Object.entries(this.metrics)) {
      result[type] = metrics.filter(m => 
        m.timestamp >= startTime && m.timestamp <= endTime
      );
    }

    return result;
  }

  /**
   * Get performance statistics
   * @returns {object} - Performance stats
   */
  getPerformanceStats() {
    const requests = this.metrics.requests;
    const apiCalls = this.metrics.apiCalls;

    if (requests.length === 0) {
      return { averageRequestTime: 0, averageApiTime: 0 };
    }

    const requestTimes = requests.map(r => r.duration).filter(d => d);
    const apiTimes = apiCalls.map(a => a.duration).filter(d => d);

    return {
      averageRequestTime: this.calculateAverage(requestTimes),
      medianRequestTime: this.calculateMedian(requestTimes),
      p95RequestTime: this.calculatePercentile(requestTimes, 95),
      averageApiTime: this.calculateAverage(apiTimes),
      medianApiTime: this.calculateMedian(apiTimes),
      p95ApiTime: this.calculatePercentile(apiTimes, 95),
      totalTokensUsed: apiCalls.reduce((sum, call) => sum + (call.tokensUsed || 0), 0),
      estimatedCost: apiCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
    };
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getCacheStats() {
    const { totalCacheHits, totalCacheMisses } = this.counters;
    const total = totalCacheHits + totalCacheMisses;

    return {
      hits: totalCacheHits,
      misses: totalCacheMisses,
      hitRate: total > 0 ? Math.round((totalCacheHits / total) * 100) : 0,
      totalOperations: total
    };
  }

  /**
   * Get system statistics
   * @returns {object} - System stats
   */
  getSystemStats() {
    const latest = this.metrics.system[this.metrics.system.length - 1];
    
    if (!latest) {
      return { memory: process.memoryUsage(), uptime: process.uptime() };
    }

    return {
      memory: latest.memory,
      uptime: latest.uptime,
      loadAverage: latest.loadAverage
    };
  }

  /**
   * Calculate average of an array
   * @param {number[]} values - Array of numbers
   * @returns {number} - Average value
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
  }

  /**
   * Calculate median of an array
   * @param {number[]} values - Array of numbers
   * @returns {number} - Median value
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }

  /**
   * Calculate percentile of an array
   * @param {number[]} values - Array of numbers
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} - Percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Clean up old metrics beyond retention period
   */
  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.retentionPeriod;
    let cleaned = 0;

    for (const [type, metrics] of Object.entries(this.metrics)) {
      const originalLength = metrics.length;
      this.metrics[type] = metrics.filter(m => m.timestamp > cutoff);
      cleaned += originalLength - this.metrics[type].length;
    }

    if (cleaned > 0) {
      this.logOperation('metrics_cleanup', { cleaned });
    }
  }

  /**
   * Aggregate metrics for trend analysis
   */
  aggregateMetrics() {
    const now = Date.now();
    const hourlyWindow = 60 * 60 * 1000;
    const dailyWindow = 24 * 60 * 60 * 1000;

    // Aggregate hourly data
    this.aggregateTimeWindow('hourly', hourlyWindow, now);
    
    // Aggregate daily data (every 24 aggregation cycles)
    if (this.aggregated.requests.hourly.length % 24 === 0) {
      this.aggregateTimeWindow('daily', dailyWindow, now);
    }

    this.logOperation('metrics_aggregated');
  }

  /**
   * Aggregate metrics for a specific time window
   * @param {string} period - 'hourly' or 'daily'
   * @param {number} window - Window size in milliseconds
   * @param {number} endTime - End timestamp
   */
  aggregateTimeWindow(period, window, endTime) {
    const startTime = endTime - window;
    const windowMetrics = this.getMetricsInTimeRange(startTime, endTime);

    const aggregation = {
      timestamp: endTime,
      requests: {
        total: windowMetrics.requests.length,
        successful: windowMetrics.requests.filter(r => r.success).length,
        failed: windowMetrics.requests.filter(r => !r.success).length,
        averageDuration: this.calculateAverage(windowMetrics.requests.map(r => r.duration))
      },
      apiCalls: {
        total: windowMetrics.apiCalls.length,
        successful: windowMetrics.apiCalls.filter(a => a.success).length,
        failed: windowMetrics.apiCalls.filter(a => !a.success).length,
        totalTokens: windowMetrics.apiCalls.reduce((sum, a) => sum + (a.tokensUsed || 0), 0),
        totalCost: windowMetrics.apiCalls.reduce((sum, a) => sum + (a.cost || 0), 0)
      },
      errors: {
        total: windowMetrics.errors.length,
        byType: this.groupErrorsByType(windowMetrics.errors)
      }
    };

    // Add to appropriate aggregated collection
    Object.keys(this.aggregated).forEach(type => {
      this.aggregated[type][period].push(aggregation);
      
      // Keep only last 24 hours for hourly, 30 days for daily
      const maxItems = period === 'hourly' ? 24 : 30;
      if (this.aggregated[type][period].length > maxItems) {
        this.aggregated[type][period] = this.aggregated[type][period].slice(-maxItems);
      }
    });
  }

  /**
   * Group errors by type for aggregation
   * @param {object[]} errors - Error metrics
   * @returns {object} - Errors grouped by type
   */
  groupErrorsByType(errors) {
    const grouped = {};
    
    errors.forEach(error => {
      const type = error.errorType || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Export metrics for external analysis
   * @param {string} format - Export format ('json' or 'csv')
   * @returns {string} - Formatted metrics data
   */
  exportMetrics(format = 'json') {
    const metrics = this.getMetrics();
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    } else if (format === 'csv') {
      return this.convertToCsv(metrics);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert metrics to CSV format
   * @param {object} metrics - Metrics data
   * @returns {string} - CSV formatted data
   */
  convertToCsv(metrics) {
    // Simple CSV conversion for requests
    const headers = ['timestamp', 'operation', 'duration', 'success'];
    const rows = metrics.recent.lastDay.requests.map(r => [
      new Date(r.timestamp).toISOString(),
      r.operation,
      r.duration,
      r.success
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Stop background tasks and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    
    this.logOperation('metrics_service_destroyed');
  }
}

module.exports = MetricsService;
