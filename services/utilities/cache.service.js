const BaseService = require('../base/base.service');
const NodeCache = require('node-cache');
const crypto = require('crypto');

/**
 * Cache Service
 * Provides caching functionality for API responses and generated content
 * Includes TTL management, key generation, and performance monitoring
 */
class CacheService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      stdTTL: 600, // 10 minutes default
      checkPeriod: 120, // Check for expired keys every 2 minutes
      useClones: false, // Don't clone objects for better performance
      maxKeys: 1000, // Maximum number of cached items
      ...config
    };

    this.cache = new NodeCache({
      stdTTL: this.config.stdTTL,
      checkperiod: this.config.checkPeriod,
      useClones: this.config.useClones,
      maxKeys: this.config.maxKeys
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Set up event listeners for monitoring
    this.setupEventListeners();
  }

  /**
   * Set up cache event listeners for monitoring
   */
  setupEventListeners() {
    this.cache.on('set', (key, value) => {
      this.stats.sets++;
      this.logOperation('cache_set', { key, size: this.getValueSize(value) });
    });

    this.cache.on('del', (key, value) => {
      this.stats.deletes++;
      this.logOperation('cache_delete', { key });
    });

    this.cache.on('expired', (key, value) => {
      this.stats.evictions++;
      this.logOperation('cache_expired', { key });
    });

    this.cache.on('flush', () => {
      this.logOperation('cache_flush');
    });
  }

  /**
   * Generate cache key from parameters
   * @param {string} prefix - Key prefix
   * @param {object|string} params - Parameters to hash
   * @returns {string} - Generated cache key
   */
  generateKey(prefix, params) {
    let keyData;
    
    if (typeof params === 'string') {
      keyData = params;
    } else {
      // Sort object keys for consistent hashing
      keyData = JSON.stringify(params, Object.keys(params).sort());
    }

    const hash = crypto.createHash('md5').update(keyData).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or undefined if not found
   */
  async get(key) {
    this.logOperation('cache_get_attempt', { key });
    
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      this.stats.hits++;
      this.logOperation('cache_hit', { 
        key, 
        hitRate: this.getHitRate(),
        size: this.getValueSize(value)
      });
    } else {
      this.stats.misses++;
      this.logOperation('cache_miss', { 
        key, 
        hitRate: this.getHitRate() 
      });
    }
    
    return value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = null) {
    this.logOperation('cache_set_attempt', { 
      key, 
      ttl: ttl || this.config.stdTTL,
      size: this.getValueSize(value)
    });

    try {
      const success = this.cache.set(key, value, ttl);
      
      if (success) {
        this.logOperation('cache_set_success', { key });
      } else {
        this.logOperation('cache_set_failed', { key });
      }
      
      return success;
    } catch (error) {
      this.logError('cache_set', error, { key });
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<number>} - Number of deleted entries
   */
  async del(key) {
    this.logOperation('cache_delete_attempt', { key });
    const deleted = this.cache.del(key);
    
    if (deleted > 0) {
      this.logOperation('cache_delete_success', { key, deleted });
    } else {
      this.logOperation('cache_delete_notfound', { key });
    }
    
    return deleted;
  }

  /**
   * Get value with automatic caching
   * @param {string} key - Cache key
   * @param {Function} valueGenerator - Function to generate value if not cached
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<any>} - Cached or generated value
   */
  async getOrSet(key, valueGenerator, ttl = null) {
    this.logOperation('cache_get_or_set', { key });

    let value = await this.get(key);
    
    if (value === undefined) {
      this.logOperation('cache_generating_value', { key });
      
      try {
        value = await valueGenerator();
        await this.set(key, value, ttl);
        
        this.logOperation('cache_value_generated_and_cached', { 
          key, 
          size: this.getValueSize(value) 
        });
      } catch (error) {
        this.logError('cache_value_generation', error, { key });
        throw error;
      }
    }

    return value;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  async has(key) {
    return this.cache.has(key);
  }

  /**
   * Get all cache keys
   * @returns {Promise<string[]>} - Array of cache keys
   */
  async keys() {
    return this.cache.keys();
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics including hit rate, key count, etc.
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
      keyCount: cacheStats.keys,
      vsize: cacheStats.vsize,
      ksize: cacheStats.ksize,
      memory: this.getMemoryUsage(),
      config: {
        stdTTL: this.config.stdTTL,
        maxKeys: this.config.maxKeys
      }
    };
  }

  /**
   * Calculate cache hit rate
   * @returns {number} - Hit rate as percentage
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
  }

  /**
   * Get memory usage of cache
   * @returns {object} - Memory usage information
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    const cacheStats = this.cache.getStats();
    
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      cacheSize: cacheStats.vsize || 0,
      keySize: cacheStats.ksize || 0
    };
  }

  /**
   * Get size of a value in bytes (rough estimate)
   * @param {any} value - Value to measure
   * @returns {number} - Size in bytes
   */
  getValueSize(value) {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Clear all cached items
   * @returns {Promise<void>}
   */
  async flush() {
    this.logOperation('cache_flush_all');
    this.cache.flushAll();
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Set cache TTL for existing key
   * @param {string} key - Cache key
   * @param {number} ttl - New TTL in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async ttl(key, ttl) {
    this.logOperation('cache_set_ttl', { key, ttl });
    return this.cache.ttl(key, ttl);
  }

  /**
   * Get TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds, 0 if expired, undefined if not found
   */
  async getTtl(key) {
    return this.cache.getTtl(key);
  }

  /**
   * Cache structure generation responses
   * @param {object} params - Generation parameters
   * @param {object} response - API response to cache
   * @param {number} ttl - Cache TTL
   * @returns {Promise<boolean>} - Success status
   */
  async cacheStructureResponse(params, response, ttl = 1800) { // 30 minutes
    const key = this.generateKey('structure', {
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandName: params.brandName
    });

    return await this.set(key, response, ttl);
  }

  /**
   * Get cached structure response
   * @param {object} params - Generation parameters
   * @returns {Promise<object|undefined>} - Cached response or undefined
   */
  async getCachedStructureResponse(params) {
    const key = this.generateKey('structure', {
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandName: params.brandName
    });

    return await this.get(key);
  }

  /**
   * Cache image generation responses
   * @param {string} prompt - Image prompt
   * @param {object} response - Generated image data
   * @param {number} ttl - Cache TTL
   * @returns {Promise<boolean>} - Success status
   */
  async cacheImageResponse(prompt, response, ttl = 3600) { // 1 hour
    const key = this.generateKey('image', prompt);
    return await this.set(key, response, ttl);
  }

  /**
   * Get cached image response
   * @param {string} prompt - Image prompt
   * @returns {Promise<object|undefined>} - Cached response or undefined
   */
  async getCachedImageResponse(prompt) {
    const key = this.generateKey('image', prompt);
    return await this.get(key);
  }

  /**
   * Close cache and cleanup
   */
  close() {
    this.logOperation('cache_close');
    this.cache.close();
  }
}

module.exports = CacheService;
