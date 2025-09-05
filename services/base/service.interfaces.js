/**
 * Service Interfaces and Contracts
 * Defines standardized contracts for all service types in the refactored architecture
 * Addresses the "Missing Interfaces" problem mentioned in the refactor plan
 */

/**
 * Base Service Interface
 * All services must implement these core methods
 */
class IBaseService {
  constructor(config = {}) {
    if (new.target === IBaseService) {
      throw new Error('Cannot instantiate interface directly');
    }
  }

  /**
   * Set request ID for operation tracking
   * @param {string} requestId - Unique request identifier
   * @returns {IBaseService} - Returns this for chaining
   */
  setRequestId(requestId) {
    throw new Error('setRequestId method must be implemented');
  }

  /**
   * Log operation with structured data
   * @param {string} operation - Operation name
   * @param {object} data - Additional data to log
   */
  logOperation(operation, data = {}) {
    throw new Error('logOperation method must be implemented');
  }

  /**
   * Log error with context
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   * @param {object} data - Additional context data
   */
  logError(operation, error, data = {}) {
    throw new Error('logError method must be implemented');
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {object} options - Retry options
   * @returns {Promise<any>} - Operation result
   */
  async executeWithRetry(operation, options = {}) {
    throw new Error('executeWithRetry method must be implemented');
  }

  /**
   * Validate required parameters
   * @param {object} params - Parameters to validate
   * @param {Array<string>} requiredFields - Required field names
   */
  validateRequired(params, requiredFields) {
    throw new Error('validateRequired method must be implemented');
  }
}

/**
 * AI Service Interface
 * All AI services must implement these methods
 */
class IAIService extends IBaseService {
  constructor(apiKey, config = {}) {
    super(config);
    if (new.target === IAIService) {
      throw new Error('Cannot instantiate interface directly');
    }
  }

  /**
   * Validate API key with the service
   * @returns {Promise<boolean>} - True if API key is valid
   */
  async validateApiKey() {
    throw new Error('validateApiKey method must be implemented');
  }

  /**
   * Make API call to the service
   * @param {object} params - API call parameters
   * @returns {Promise<object>} - API response
   */
  async makeApiCall(params) {
    throw new Error('makeApiCall method must be implemented');
  }

  /**
   * Get usage statistics for the service
   * @returns {object} - Usage statistics
   */
  getUsageStats() {
    throw new Error('getUsageStats method must be implemented');
  }

  /**
   * Get model name being used
   * @returns {string} - Model name
   */
  getModel() {
    throw new Error('getModel method must be implemented');
  }
}

/**
 * Structure Service Interface
 * Contract for website structure generation services
 */
class IStructureService extends IAIService {
  /**
   * Generate website structure based on parameters
   * @param {object} params - Generation parameters
   * @param {string} params.primaryKeyword - Primary keyword
   * @param {string} params.brandName - Brand name
   * @param {string} params.businessType - Type of business
   * @returns {Promise<object>} - Generated structure
   */
  async generateStructure(params) {
    throw new Error('generateStructure method must be implemented');
  }

  /**
   * Validate structure generation parameters
   * @param {object} params - Parameters to validate
   * @returns {boolean} - True if valid
   */
  validateStructureParams(params) {
    throw new Error('validateStructureParams method must be implemented');
  }
}

/**
 * Content Service Interface
 * Contract for HTML content generation services
 */
class IContentService extends IAIService {
  /**
   * Generate HTML content based on structure and parameters
   * @param {object} params - Generation parameters
   * @param {object} params.structure - Website structure
   * @param {string} params.primaryKeyword - Primary keyword
   * @param {string} params.brandName - Brand name
   * @returns {Promise<string>} - Generated HTML content
   */
  async generateHTML(params) {
    throw new Error('generateHTML method must be implemented');
  }

  /**
   * Parse image references from HTML content
   * @param {string} htmlContent - HTML content to parse
   * @returns {Promise<Array>} - Array of image references
   */
  async parseImageReferences(htmlContent) {
    throw new Error('parseImageReferences method must be implemented');
  }

  /**
   * Validate HTML content
   * @param {string} htmlContent - HTML to validate
   * @returns {Promise<object>} - Validation result
   */
  async validateHTML(htmlContent) {
    throw new Error('validateHTML method must be implemented');
  }
}

/**
 * Image Prompt Service Interface
 * Contract for image prompt generation services
 */
class IImagePromptService extends IAIService {
  /**
   * Generate image prompts based on HTML content and image references
   * @param {string} htmlContent - HTML content for context
   * @param {Array} imageReferences - Image references to generate prompts for
   * @returns {Promise<Array>} - Array of generated prompts
   */
  async generatePrompts(htmlContent, imageReferences) {
    throw new Error('generatePrompts method must be implemented');
  }

  /**
   * Generate batch prompts for multiple images
   * @param {Array} imageRequests - Array of image generation requests
   * @returns {Promise<Array>} - Array of generated prompts
   */
  async generateBatchPrompts(imageRequests) {
    throw new Error('generateBatchPrompts method must be implemented');
  }
}

/**
 * Image Generation Service Interface
 * Contract for image generation services
 */
class IImageGenerationService extends IAIService {
  /**
   * Generate images from prompts
   * @param {Array} prompts - Array of image prompts
   * @param {string} outputDir - Output directory for images
   * @returns {Promise<Array>} - Array of generated image info
   */
  async generateImages(prompts, outputDir) {
    throw new Error('generateImages method must be implemented');
  }

  /**
   * Generate single image from prompt
   * @param {object} promptData - Prompt data for image generation
   * @param {string} outputDir - Output directory
   * @returns {Promise<object>} - Generated image info
   */
  async generateSingleImage(promptData, outputDir) {
    throw new Error('generateSingleImage method must be implemented');
  }
}

/**
 * Processing Service Interface
 * Contract for file processing services
 */
class IProcessingService extends IBaseService {
  /**
   * Process files or content
   * @param {any} input - Input to process
   * @param {object} options - Processing options
   * @returns {Promise<any>} - Processing result
   */
  async process(input, options = {}) {
    throw new Error('process method must be implemented');
  }

  /**
   * Validate processing input
   * @param {any} input - Input to validate
   * @returns {boolean} - True if valid
   */
  validateInput(input) {
    throw new Error('validateInput method must be implemented');
  }
}

/**
 * HTML Combiner Service Interface
 * Contract for HTML combination and embedding services
 */
class IHTMLCombinerService extends IProcessingService {
  /**
   * Create self-contained HTML with embedded images
   * @param {string} htmlContent - HTML content
   * @param {Array} images - Array of image objects
   * @param {string} outputDir - Output directory
   * @param {string} filename - Output filename
   * @returns {Promise<object>} - Combined HTML result
   */
  async createSelfContainedHTML(htmlContent, images, outputDir, filename) {
    throw new Error('createSelfContainedHTML method must be implemented');
  }

  /**
   * Embed images as base64 in HTML
   * @param {string} htmlContent - HTML content
   * @param {Array} images - Images to embed
   * @returns {Promise<string>} - HTML with embedded images
   */
  async embedImages(htmlContent, images) {
    throw new Error('embedImages method must be implemented');
  }

  /**
   * Optimize HTML content
   * @param {string} htmlContent - HTML to optimize
   * @returns {string} - Optimized HTML
   */
  optimizeHTML(htmlContent) {
    throw new Error('optimizeHTML method must be implemented');
  }
}

/**
 * File Manager Service Interface
 * Contract for file management services
 */
class IFileManagerService extends IProcessingService {
  /**
   * Generate additional files (robots.txt, sitemap.xml, etc.)
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<Array>} - Array of generated file info
   */
  async generateAdditionalFiles(outputDir, params) {
    throw new Error('generateAdditionalFiles method must be implemented');
  }

  /**
   * Save file to filesystem
   * @param {string} filepath - File path
   * @param {string} content - File content
   * @returns {Promise<object>} - Save result
   */
  async saveFile(filepath, content) {
    throw new Error('saveFile method must be implemented');
  }
}

/**
 * HTML Parser Service Interface
 * Contract for HTML parsing and analysis services
 */
class IHTMLParserService extends IProcessingService {
  /**
   * Parse HTML content and extract metadata
   * @param {string} htmlContent - HTML to parse
   * @returns {Promise<object>} - Parsed HTML data
   */
  async parseHTML(htmlContent) {
    throw new Error('parseHTML method must be implemented');
  }

  /**
   * Analyze SEO factors in HTML
   * @param {string} htmlContent - HTML to analyze
   * @returns {Promise<object>} - SEO analysis result
   */
  async analyzeSEO(htmlContent) {
    throw new Error('analyzeSEO method must be implemented');
  }

  /**
   * Check accessibility compliance
   * @param {string} htmlContent - HTML to check
   * @returns {Promise<object>} - Accessibility analysis
   */
  async analyzeAccessibility(htmlContent) {
    throw new Error('analyzeAccessibility method must be implemented');
  }
}

/**
 * Utility Service Interface
 * Contract for utility services
 */
class IUtilityService extends IBaseService {
  /**
   * Get service configuration
   * @returns {object} - Service configuration
   */
  getConfig() {
    throw new Error('getConfig method must be implemented');
  }

  /**
   * Get service statistics
   * @returns {object} - Service statistics
   */
  getStats() {
    throw new Error('getStats method must be implemented');
  }
}

/**
 * Cache Service Interface
 * Contract for caching services
 */
class ICacheService extends IUtilityService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null
   */
  async get(key) {
    throw new Error('get method must be implemented');
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl) {
    throw new Error('set method must be implemented');
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    throw new Error('del method must be implemented');
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('clear method must be implemented');
  }
}

/**
 * Retry Service Interface
 * Contract for retry logic services
 */
class IRetryService extends IUtilityService {
  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {object} options - Retry options
   * @returns {Promise<any>} - Operation result
   */
  async executeWithRetry(operation, options) {
    throw new Error('executeWithRetry method must be implemented');
  }

  /**
   * Get retry statistics
   * @returns {object} - Retry statistics
   */
  getRetryStats() {
    throw new Error('getRetryStats method must be implemented');
  }
}

/**
 * Placeholder Service Interface
 * Contract for placeholder generation services
 */
class IPlaceholderService extends IUtilityService {
  /**
   * Generate placeholder image
   * @param {object} options - Image options
   * @returns {Promise<object>} - Placeholder image info
   */
  async generatePlaceholderImage(options) {
    throw new Error('generatePlaceholderImage method must be implemented');
  }

  /**
   * Generate placeholder text content
   * @param {object} options - Text options
   * @returns {object} - Generated text content
   */
  generatePlaceholderText(options) {
    throw new Error('generatePlaceholderText method must be implemented');
  }
}

/**
 * Core Service Interface
 * Contract for core business logic services
 */
class ICoreService extends IBaseService {
  /**
   * Initialize service with configuration
   * @param {object} config - Service configuration
   * @returns {Promise<void>}
   */
  async initialize(config) {
    throw new Error('initialize method must be implemented');
  }

  /**
   * Get service health status
   * @returns {Promise<object>} - Health status
   */
  async getHealthStatus() {
    throw new Error('getHealthStatus method must be implemented');
  }
}

/**
 * Validation Service Interface
 * Contract for validation services
 */
class IValidationService extends ICoreService {
  /**
   * Validate generation parameters
   * @param {object} params - Parameters to validate
   * @returns {Promise<object>} - Validated parameters
   */
  async validateGenerationParams(params) {
    throw new Error('validateGenerationParams method must be implemented');
  }

  /**
   * Validate API key format and validity
   * @param {string} apiKey - API key to validate
   * @returns {Promise<string>} - Validated API key
   */
  async validateApiKey(apiKey) {
    throw new Error('validateApiKey method must be implemented');
  }

  /**
   * Validate output directory
   * @param {string} outputDir - Directory to validate
   * @returns {Promise<string>} - Validated directory path
   */
  async validateOutputDirectory(outputDir) {
    throw new Error('validateOutputDirectory method must be implemented');
  }
}

/**
 * Metrics Service Interface
 * Contract for metrics and monitoring services
 */
class IMetricsService extends ICoreService {
  /**
   * Record metric data
   * @param {string} metricName - Name of the metric
   * @param {number} value - Metric value
   * @param {object} tags - Additional tags
   */
  recordMetric(metricName, value, tags) {
    throw new Error('recordMetric method must be implemented');
  }

  /**
   * Get all metrics
   * @returns {object} - All recorded metrics
   */
  getMetrics() {
    throw new Error('getMetrics method must be implemented');
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    throw new Error('resetMetrics method must be implemented');
  }
}

/**
 * Orchestrator Service Interface
 * Contract for main workflow orchestration services
 */
class IOrchestratorService extends ICoreService {
  /**
   * Generate complete website
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Generation result
   */
  async generateSite(params) {
    throw new Error('generateSite method must be implemented');
  }

  /**
   * Get system status
   * @returns {Promise<object>} - System status
   */
  async getSystemStatus() {
    throw new Error('getSystemStatus method must be implemented');
  }

  /**
   * Check individual service status
   * @param {string} serviceName - Name of service to check
   * @param {object} service - Service instance
   * @returns {Promise<object>} - Service status
   */
  async checkServiceStatus(serviceName, service) {
    throw new Error('checkServiceStatus method must be implemented');
  }
}

/**
 * Service Factory Interface
 * Contract for service factory implementations
 */
class IServiceFactory {
  /**
   * Set global configuration
   * @param {object} config - Global configuration
   * @returns {IServiceFactory} - Returns this for chaining
   */
  setConfig(config) {
    throw new Error('setConfig method must be implemented');
  }

  /**
   * Register a service class
   * @param {string} name - Service name
   * @param {Function} ServiceClass - Service constructor
   * @param {object} config - Service-specific configuration
   * @param {boolean} singleton - Whether service should be singleton
   * @returns {IServiceFactory} - Returns this for chaining
   */
  register(name, ServiceClass, config, singleton) {
    throw new Error('register method must be implemented');
  }

  /**
   * Create service instance
   * @param {string} name - Service name
   * @param {...any} args - Constructor arguments
   * @returns {object} - Service instance
   */
  create(name, ...args) {
    throw new Error('create method must be implemented');
  }

  /**
   * Create all registered services
   * @param {string} apiKey - API key for AI services
   * @returns {object} - Object with all service instances
   */
  createAll(apiKey) {
    throw new Error('createAll method must be implemented');
  }

  /**
   * Get factory status
   * @returns {object} - Factory status and registered services
   */
  getStatus() {
    throw new Error('getStatus method must be implemented');
  }

  /**
   * Clear all registered services
   */
  clear() {
    throw new Error('clear method must be implemented');
  }
}

module.exports = {
  // Base interfaces
  IBaseService,
  IAIService,
  IProcessingService,
  IUtilityService,
  ICoreService,

  // AI service interfaces
  IStructureService,
  IContentService,
  IImagePromptService,
  IImageGenerationService,

  // Processing service interfaces
  IHTMLCombinerService,
  IFileManagerService,
  IHTMLParserService,

  // Utility service interfaces
  ICacheService,
  IRetryService,
  IPlaceholderService,

  // Core service interfaces
  IValidationService,
  IMetricsService,
  IOrchestratorService,

  // Factory interface
  IServiceFactory
};
