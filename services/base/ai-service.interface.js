/**
 * AI Service Interface
 * Abstract interface that all AI services must implement
 * Ensures consistent API across different AI service implementations
 */
const BaseService = require('./base.service');

class AIServiceInterface extends BaseService {
  constructor(apiKey, config = {}) {
    if (new.target === AIServiceInterface) {
      throw new Error('Cannot instantiate interface directly');
    }
    
    super(config);
    
    this.apiKey = apiKey;
    this.model = config.model;
    this.client = null; // Should be initialized by implementing class
    
    this.usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0,
      successfulRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Validate API key functionality
   * @returns {Promise<boolean>} - True if API key is valid and working
   */
  async validateApiKey() {
    throw new Error('validateApiKey method must be implemented by subclass');
  }

  /**
   * Make API call to AI service
   * @param {string|object} prompt - Prompt or parameters for the API call
   * @returns {Promise<object>} - API response
   */
  async makeApiCall(prompt) {
    throw new Error('makeApiCall method must be implemented by subclass');
  }

  /**
   * Generate content using AI service
   * @param {object} params - Parameters for content generation
   * @returns {Promise<object>} - Generated content with metadata
   */
  async generate(params) {
    throw new Error('generate method must be implemented by subclass');
  }

  /**
   * Process and validate response from AI service
   * @param {object} response - Raw API response
   * @returns {object} - Processed and validated response
   */
  processResponse(response) {
    throw new Error('processResponse method must be implemented by subclass');
  }

  /**
   * Get usage statistics for this service
   * @returns {object} - Usage statistics including tokens, requests, errors
   */
  getUsageStats() {
    const totalRequests = this.usageStats.totalRequests;
    return { 
      ...this.usageStats,
      successRate: totalRequests > 0 ? Math.round((this.usageStats.successfulRequests / totalRequests) * 100) : 0,
      averageCostPerRequest: this.calculateAverageCostPerRequest()
    };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats() {
    this.usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0,
      successfulRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Update usage statistics
   * @param {object} stats - Statistics to add
   */
  updateUsageStats(stats) {
    if (stats.tokens) this.usageStats.totalTokens += stats.tokens;
    if (stats.requests) this.usageStats.totalRequests += stats.requests;
    if (stats.errors) this.usageStats.errors += stats.errors;
    if (stats.successful) this.usageStats.successfulRequests += stats.successful;
    
    // Update average response time
    if (stats.responseTime) {
      const totalRequests = this.usageStats.totalRequests;
      if (totalRequests === 1) {
        this.usageStats.averageResponseTime = stats.responseTime;
      } else {
        this.usageStats.averageResponseTime = Math.round(
          (this.usageStats.averageResponseTime * (totalRequests - 1) + stats.responseTime) / totalRequests
        );
      }
    }
  }

  /**
   * Calculate average cost per request
   * @returns {number} - Average cost per request
   */
  calculateAverageCostPerRequest() {
    const totalRequests = this.usageStats.totalRequests;
    if (totalRequests === 0) return 0;
    
    const costEstimation = this.getCostEstimation();
    return Math.round((costEstimation.estimatedCost / totalRequests) * 10000) / 10000;
  }

  /**
   * Get cost estimation for usage
   * @returns {object} - Cost estimation based on usage
   */
  getCostEstimation() {
    throw new Error('getCostEstimation method must be implemented by subclass');
  }

  /**
   * Get model information
   * @returns {object} - Model details including name, limits, capabilities
   */
  getModelInfo() {
    throw new Error('getModelInfo method must be implemented by subclass');
  }

  /**
   * Prepare data for passing to other AI services
   * @param {object} data - Service output data
   * @returns {object} - Standardized data format for service chaining
   */
  prepareForChaining(data) {
    return {
      serviceType: this.constructor.name,
      model: this.model,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        tokensUsed: data.metadata?.tokensUsed || 0,
        duration: data.metadata?.duration || 0,
        success: data.success || false
      }
    };
  }

  /**
   * Extract relevant data from chained service input
   * @param {object} chainedInput - Input from another AI service
   * @returns {object} - Extracted data ready for processing
   */
  extractFromChain(chainedInput) {
    if (chainedInput.serviceType && chainedInput.data) {
      this.logOperation('Received chained input', {
        fromService: chainedInput.serviceType,
        model: chainedInput.model,
        timestamp: chainedInput.timestamp
      });
      return chainedInput.data;
    }
    
    // If not chained input, return as-is
    return chainedInput;
  }

  /**
   * Validate that service implements all required methods
   * @returns {object} - Validation result
   */
  validateImplementation() {
    const requiredMethods = [
      'validateApiKey',
      'makeApiCall', 
      'generate',
      'processResponse',
      'getCostEstimation',
      'getModelInfo'
    ];

    const missingMethods = requiredMethods.filter(method => 
      typeof this[method] !== 'function' || 
      this[method].toString().includes('must be implemented')
    );

    return {
      isValid: missingMethods.length === 0,
      missingMethods,
      implementedMethods: requiredMethods.filter(method => !missingMethods.includes(method))
    };
  }
}

module.exports = AIServiceInterface;
