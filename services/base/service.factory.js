const logger = require('../../src/utils/logger');

/**
 * Service Factory
 * Manages service registration, creation, and dependency injection
 * Provides centralized service configuration and instance management
 */
class ServiceFactory {
  constructor() {
    this.services = new Map();
    this.instances = new Map();
    this.config = {};
    this.singletons = new Set();
  }

  /**
   * Set global configuration for all services
   * @param {object} config - Global configuration object
   * @returns {ServiceFactory} - Returns this for chaining
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
    logger.info('Service factory configuration updated', {
      configKeys: Object.keys(this.config)
    });
    return this;
  }

  /**
   * Register a service class with the factory
   * @param {string} name - Service name
   * @param {class} ServiceClass - Service class constructor
   * @param {object} config - Service-specific configuration
   * @param {boolean} singleton - Whether to create as singleton
   * @returns {ServiceFactory} - Returns this for chaining
   */
  register(name, ServiceClass, config = {}, singleton = false) {
    this.services.set(name, { 
      ServiceClass, 
      config: { ...this.config, ...config },
      singleton 
    });
    
    if (singleton) {
      this.singletons.add(name);
    }

    logger.info(`Service registered: ${name}`, {
      className: ServiceClass.name,
      singleton,
      configKeys: Object.keys(config)
    });

    return this;
  }

  /**
   * Create a service instance
   * @param {string} name - Service name
   * @param {...any} args - Constructor arguments
   * @returns {object} - Service instance
   */
  create(name, ...args) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not registered`);
    }

    const { ServiceClass, config, singleton } = this.services.get(name);

    // Return existing singleton instance if it exists
    if (singleton && this.instances.has(name)) {
      return this.instances.get(name);
    }

    logger.info(`Creating service: ${name}`, {
      className: ServiceClass.name,
      singleton,
      args: args.length
    });

    try {
      const instance = new ServiceClass(...args, config);
      
      // Store singleton instance
      if (singleton) {
        this.instances.set(name, instance);
      }

      return instance;
    } catch (error) {
      logger.error(`Failed to create service: ${name}`, {
        error: error.message,
        className: ServiceClass.name
      });
      throw error;
    }
  }

  /**
   * Create all registered services
   * @param {string} apiKey - API key for services that require it
   * @returns {object} - Object containing all service instances
   */
  createAll(apiKey) {
    const instances = {};
    
    for (const [name] of this.services) {
      try {
        instances[name] = this.create(name, apiKey);
      } catch (error) {
        logger.error(`Failed to create service '${name}' during bulk creation`, {
          error: error.message
        });
        // Continue creating other services even if one fails
      }
    }
    
    logger.info('Bulk service creation completed', {
      requested: this.services.size,
      created: Object.keys(instances).length,
      failed: this.services.size - Object.keys(instances).length
    });

    return instances;
  }

  /**
   * Get existing singleton instance
   * @param {string} name - Service name
   * @returns {object|null} - Service instance or null if not found
   */
  getInstance(name) {
    return this.instances.get(name) || null;
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean} - True if service is registered
   */
  isRegistered(name) {
    return this.services.has(name);
  }

  /**
   * Get list of registered service names
   * @returns {string[]} - Array of service names
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   * @returns {boolean} - True if service was unregistered
   */
  unregister(name) {
    const wasRegistered = this.services.delete(name);
    this.instances.delete(name);
    this.singletons.delete(name);
    
    if (wasRegistered) {
      logger.info(`Service unregistered: ${name}`);
    }
    
    return wasRegistered;
  }

  /**
   * Clear all registrations and instances
   */
  clear() {
    const serviceCount = this.services.size;
    this.services.clear();
    this.instances.clear();
    this.singletons.clear();
    
    logger.info(`Service factory cleared`, { clearedServices: serviceCount });
  }

  /**
   * Get factory status and statistics
   * @returns {object} - Factory status information
   */
  getStatus() {
    return {
      registeredServices: this.services.size,
      singletonInstances: this.instances.size,
      singletonServices: this.singletons.size,
      services: Array.from(this.services.keys()),
      singletons: Array.from(this.singletons),
      configKeys: Object.keys(this.config)
    };
  }
}

module.exports = ServiceFactory;
