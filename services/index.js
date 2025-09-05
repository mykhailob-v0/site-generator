// Service Base Classes
const BaseService = require('./base/base.service');
const AIServiceInterface = require('./base/ai-service.interface');
const ServiceFactory = require('./base/service.factory');

// Core Services
const ValidationService = require('./core/validation.service');
const MetricsService = require('./core/metrics.service');
const CacheService = require('./utilities/cache.service');
const OrchestratorService = require('./core/orchestrator.service');

// AI Services
const StructureService = require('./ai/structure.service');
const ContentService = require('./ai/content.service');
const ImagePromptService = require('./ai/image-prompt.service');
const ImageGenerationService = require('./ai/image-generation.service');

// Processing Services
const FileManagerService = require('./processing/file-manager.service');
const HTMLParserService = require('./processing/html-parser.service');
const HTMLCombinerService = require('./processing/html-combiner.service');

// Utility Services
const RetryService = require('./utilities/retry.service');
const PlaceholderService = require('./utilities/placeholder.service');
const PromptService = require('./utilities/prompt.service');

// Import existing services (legacy - to be deprecated)
const StructureGeneratorService = require('./structure-generator.service');
const GeneratorService = require('./generator.service');
const GeneratorEnhancedService = require('./generator-enhanced.service');
const HtmlGeneratorService = require('./html-generator.service');
const ImageGeneratorService = require('./image-generator.service');
const ImagePromptGeneratorService = require('./image-prompt-generator.service');

/**
 * Service Registry
 * Centralized registry for all services with dependency injection support
 */
class ServiceRegistry {
  constructor() {
    this.factory = new ServiceFactory();
    this.initialized = false;
  }

  /**
   * Initialize service registry with configuration
   * @param {object} config - Global configuration
   * @returns {ServiceRegistry} - Returns this for chaining
   */
  initialize(config = {}) {
    if (this.initialized) {
      return this;
    }

    this.factory.setConfig(config);

    // Register core services
    this.factory.register('cache', CacheService, config.cache || {}, true); // Singleton
    this.factory.register('validation', ValidationService, config.validation || {}, true); // Singleton
    this.factory.register('metrics', MetricsService, config.metrics || {}, true); // Singleton
    this.factory.register('orchestrator', OrchestratorService, config.orchestrator || {});

    // Register AI services
    this.factory.register('structure', StructureService, config.ai || {});
    this.factory.register('content', ContentService, config.ai || {});
    this.factory.register('imagePrompt', ImagePromptService, config.ai || {});
    this.factory.register('imageGeneration', ImageGenerationService, config.ai || {});

    // Register processing services
    this.factory.register('fileManager', FileManagerService, config.processing || {});
    this.factory.register('htmlParser', HTMLParserService, config.processing || {});
    this.factory.register('htmlCombiner', HTMLCombinerService, config.processing || {});

    // Register utility services
    this.factory.register('retry', RetryService, config.retry || {}, true); // Singleton
    this.factory.register('placeholder', PlaceholderService, config.placeholder || {});
    this.factory.register('prompt', PromptService, config.prompt || { promptsDirectory: './prompts' }, true); // Singleton

    // Register existing services (legacy - to be deprecated)
    this.factory.register('structureGenerator', StructureGeneratorService, config.ai || {});
    this.factory.register('generator', GeneratorService, config.ai || {});
    this.factory.register('generatorEnhanced', GeneratorEnhancedService, config.ai || {});
    this.factory.register('htmlGenerator', HtmlGeneratorService, config.ai || {});
    this.factory.register('imageGenerator', ImageGeneratorService, config.ai || {});
    this.factory.register('imagePromptGenerator', ImagePromptGeneratorService, config.ai || {});

    this.initialized = true;
    return this;
  }

  /**
   * Get service factory instance
   * @returns {ServiceFactory} - Service factory
   */
  getFactory() {
    return this.factory;
  }

  /**
   * Create a specific service
   * @param {string} serviceName - Name of service to create
   * @param {...any} args - Constructor arguments
   * @returns {object} - Service instance
   */
  createService(serviceName, ...args) {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }
    
    return this.factory.create(serviceName, ...args);
  }

  /**
   * Create all services with provided API key
   * @param {string} apiKey - OpenAI API key
   * @returns {object} - Object containing all service instances
   */
  createAllServices(apiKey) {
    if (!this.initialized) {
      throw new Error('Service registry not initialized. Call initialize() first.');
    }

    return this.factory.createAll(apiKey);
  }

  /**
   * Get service registry status
   * @returns {object} - Registry status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      factory: this.factory.getStatus()
    };
  }

  /**
   * Reset registry (mainly for testing)
   */
  reset() {
    this.factory.clear();
    this.initialized = false;
  }
}

// Create singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = {
  // Export singleton registry
  serviceRegistry,
  
  // Export individual service classes for direct use
  BaseService,
  AIServiceInterface,
  ServiceFactory,
  
  // Core services
  ValidationService,
  MetricsService,
  OrchestratorService,
  CacheService,
  
  // AI services
  StructureService,
  ContentService,
  ImagePromptService,
  ImageGenerationService,
  
  // Processing services
  FileManagerService,
  HTMLParserService,
  HTMLCombinerService,
  
  // Utility services
  RetryService,
  PlaceholderService,
  PromptService,
  
  // Legacy services (to be deprecated)
  StructureGeneratorService,
  GeneratorService,
  GeneratorEnhancedService,
  HtmlGeneratorService,
  ImageGeneratorService,
  ImagePromptGeneratorService,
  HTMLCombinerService,

  // Convenience functions
  createService: (serviceName, ...args) => serviceRegistry.createService(serviceName, ...args),
  createAllServices: (apiKey) => serviceRegistry.createAllServices(apiKey),
  initializeServices: (config) => serviceRegistry.initialize(config),
  getServiceStatus: () => serviceRegistry.getStatus(),
  
  // Direct service initialization helpers
  initializeWithDefaults: (apiKey, config = {}) => {
    const defaultConfig = {
      ai: { model: 'gpt-5-2025-08-07', maxRetries: 3, timeout: 30000 },
      processing: { outputDir: './output' },
      cache: { ttl: 3600 },
      ...config
    };
    
    serviceRegistry.initialize(defaultConfig);
    return serviceRegistry.createAllServices(apiKey);
  }
};
