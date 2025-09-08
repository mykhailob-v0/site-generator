const BaseService = require('../base/base.service');
const { validateGenerationParams } = require('../../src/utils/validation');
const { logLevelManager } = require('../../src/utils/log-levels');
const { ValidationError } = require('../../src/utils/errors');
const path = require('path');
const fs = require('fs').promises;

/**
 * Validation Service
 * Handles all input validation for the application
 * Extends the existing validation utilities with service-level logging and error handling
 */
class ValidationService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    // Default validation rules
    const defaultRules = {
      keywords: {
        minLength: 2,
        maxLength: 100,
        allowedChars: /^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s\-_.,:;!?]+$/
      },
      brandName: {
        minLength: 1,
        maxLength: 50,
        allowedChars: /^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s\-_.&]+$/
      },
      outputDir: {
        maxDepth: 10,
        forbiddenPaths: ['/etc', '/var', '/usr', '/bin', '/sbin']
      },
      apiKey: {
        prefix: 'sk-',
        minLength: 20
      }
    };

    // Deep merge config validation rules with defaults
    this.validationRules = this.deepMerge(defaultRules, config.validationRules || {});
  }

  /**
   * Deep merge two objects, preserving nested properties
   * @param {object} target - Target object
   * @param {object} source - Source object to merge
   * @returns {object} - Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !source[key].test) {
        // It's an object but not a regex
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        // It's a primitive value or regex
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Validate parameters for site generation
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Validated and sanitized parameters
   */
  async validateGenerationParams(params) {
    this.logOperation('validateGenerationParams', { 
      paramKeys: Object.keys(params),
      hasApiKey: !!params.apiKey 
    });

    try {
      // Use existing validation utility as base
      const baseValidated = validateGenerationParams(params);
      
      // Set log level if provided
      if (baseValidated.logLevel) {
        logLevelManager.setLevel(baseValidated.logLevel);
        
        // Update Winston logger level
        const logger = require('../../src/utils/logger');
        if (logger.updateLogLevel) {
          logger.updateLogLevel();
        }
        
        this.log(`Log level set to: ${baseValidated.logLevel}`, 'info', {
          logLevel: baseValidated.logLevel,
          description: logLevelManager.getDisplayInfo()
        });
      }
      
      // Additional service-level validations
      const enhanced = await this.enhanceValidation(baseValidated);
      
      this.logOperation('Validation successful', { 
        validatedParams: Object.keys(enhanced),
        outputDir: enhanced.outputDir,
        logLevel: enhanced.logLevel || 'minimal'
      });
      
      return enhanced;
    } catch (error) {
      this.logError('validateGenerationParams', error, { 
        paramKeys: Object.keys(params) 
      });
      throw new ValidationError(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Enhanced validation with additional checks
   * @param {object} params - Base validated parameters
   * @returns {Promise<object>} - Enhanced validated parameters
   */
  async enhanceValidation(params) {
    const enhanced = { ...params };

    // Just validate the provided output directory directly for now
    enhanced.outputDir = await this.validateOutputDirectory(params.outputDir);
    
    // Validate API key format and accessibility
    if (params.apiKey) {
      enhanced.apiKey = await this.validateApiKey(params.apiKey);
    }

    // Validate keywords for content appropriateness
    enhanced.primaryKeyword = this.validateKeyword(params.primaryKeyword, 'primaryKeyword');
    enhanced.secondaryKeywords = params.secondaryKeywords.map(keyword => 
      this.validateKeyword(keyword, 'secondaryKeyword')
    );

    // Validate brand name
    enhanced.brandName = this.validateBrandName(params.brandName);

    // Validate needImages parameter
    if (params.needImages !== undefined) {
      enhanced.needImages = this.validateNeedImages(params.needImages);
    }

    // Add timestamp and request tracking
    enhanced.validatedAt = new Date().toISOString();
    enhanced.requestId = this.requestId;

    return enhanced;
  }

  /**
   * Create project-specific directory with keyword and timestamp
   * @param {string} baseOutputDir - Base output directory
   * @param {string} primaryKeyword - Primary keyword for directory naming
   * @returns {string} - Project-specific directory path
   */
  createProjectDirectory(baseOutputDir, primaryKeyword) {
    // Sanitize keyword for directory name (similar to legacy system)
    const sanitizedKeyword = primaryKeyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create timestamp (YYYY-MM-DD format like legacy)
    const timestamp = new Date().toISOString().slice(0, 10);
    
    // Create project directory path
    const projectDir = path.join(baseOutputDir, `${sanitizedKeyword}-${timestamp}`);
    
    this.logOperation('Created project directory path', { 
      baseOutputDir, 
      sanitizedKeyword, 
      timestamp, 
      projectDir 
    });
    
    return projectDir;
  }

  /**
   * Validate API key format and basic structure
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<string>} - Validated API key
   */
  async validateApiKey(apiKey) {
    this.logOperation('validateApiKey');

    if (!apiKey || typeof apiKey !== 'string') {
      throw new ValidationError('API key is required and must be a string');
    }

    if (apiKey.length < this.validationRules.apiKey.minLength) {
      throw new ValidationError(`API key too short (minimum ${this.validationRules.apiKey.minLength} characters)`);
    }

    if (!apiKey.startsWith(this.validationRules.apiKey.prefix)) {
      throw new ValidationError(`Invalid API key format (must start with '${this.validationRules.apiKey.prefix}')`);
    }

    // Check for obvious dummy/test keys
    const dummyPatterns = ['sk-test', 'sk-dummy', 'sk-fake', 'sk-example'];
    if (dummyPatterns.some(pattern => apiKey.toLowerCase().includes(pattern))) {
      throw new ValidationError('Invalid API key: appears to be a test/dummy key');
    }

    this.logOperation('API key validation passed');
    return apiKey;
  }

  /**
   * Validate and prepare output directory
   * @param {string} outputDir - Output directory path
   * @returns {Promise<string>} - Validated absolute path
   */
  async validateOutputDirectory(outputDir) {
    this.logOperation('validateOutputDirectory', { outputDir });

    if (!outputDir || typeof outputDir !== 'string') {
      throw new ValidationError('Output directory is required');
    }

    // Convert to absolute path
    const absolutePath = path.resolve(outputDir);

    // Check for forbidden paths
    const isForbidden = this.validationRules.outputDir.forbiddenPaths.some(forbidden => 
      absolutePath.startsWith(forbidden)
    );
    
    if (isForbidden) {
      throw new ValidationError(`Output directory cannot be in system directories: ${absolutePath}`);
    }

    // Check directory depth
    const depth = absolutePath.split(path.sep).length;
    if (depth > this.validationRules.outputDir.maxDepth) {
      throw new ValidationError(`Directory path too deep (maximum ${this.validationRules.outputDir.maxDepth} levels)`);
    }

    // Ensure directory exists or can be created
    try {
      await fs.mkdir(absolutePath, { recursive: true });
      
      // Test write permissions
      const testFile = path.join(absolutePath, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
    } catch (error) {
      throw new ValidationError(`Cannot create or write to output directory: ${error.message}`);
    }

    this.logOperation('Output directory validation passed', { absolutePath });
    return absolutePath;
  }

  /**
   * Validate individual keyword
   * @param {string} keyword - Keyword to validate
   * @param {string} type - Type of keyword (primary/secondary)
   * @returns {string} - Validated and sanitized keyword
   */
  validateKeyword(keyword, type) {
    if (!keyword || typeof keyword !== 'string') {
      throw new ValidationError(`${type} must be a non-empty string`);
    }

    const trimmed = keyword.trim();
    
    if (trimmed.length < this.validationRules.keywords.minLength) {
      throw new ValidationError(`${type} too short (minimum ${this.validationRules.keywords.minLength} characters)`);
    }

    if (trimmed.length > this.validationRules.keywords.maxLength) {
      throw new ValidationError(`${type} too long (maximum ${this.validationRules.keywords.maxLength} characters)`);
    }

    if (!this.validationRules.keywords.allowedChars.test(trimmed)) {
      throw new ValidationError(`${type} contains invalid characters`);
    }

    // Check for potentially harmful content
    const harmfulPatterns = [
      /javascript:/i,
      /<script/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ];

    if (harmfulPatterns.some(pattern => pattern.test(trimmed))) {
      throw new ValidationError(`${type} contains potentially harmful content`);
    }

    return trimmed;
  }

  /**
   * Validate brand name
   * @param {string} brandName - Brand name to validate
   * @returns {string} - Validated brand name
   */
  validateBrandName(brandName) {
    if (!brandName || typeof brandName !== 'string') {
      throw new ValidationError('Brand name is required');
    }

    const trimmed = brandName.trim();
    
    if (trimmed.length < this.validationRules.brandName.minLength) {
      throw new ValidationError(`Brand name too short (minimum ${this.validationRules.brandName.minLength} character)`);
    }

    if (trimmed.length > this.validationRules.brandName.maxLength) {
      throw new ValidationError(`Brand name too long (maximum ${this.validationRules.brandName.maxLength} characters)`);
    }

    if (!this.validationRules.brandName.allowedChars.test(trimmed)) {
      throw new ValidationError('Brand name contains invalid characters');
    }

    return trimmed;
  }

  /**
   * Validate needImages parameter
   * @param {boolean|string} needImages - Need images flag
   * @returns {boolean} - Validated boolean value
   */
  validateNeedImages(needImages) {
    if (needImages === undefined || needImages === null) {
      return true; // Default to true if not specified
    }

    // Handle string values
    if (typeof needImages === 'string') {
      const lowercased = needImages.toLowerCase();
      if (lowercased === 'true') return true;
      if (lowercased === 'false') return false;
      throw new ValidationError('needImages must be a boolean value or "true"/"false" string');
    }

    // Handle boolean values
    if (typeof needImages === 'boolean') {
      return needImages;
    }

    throw new ValidationError('needImages must be a boolean value');
  }

  /**
   * Validate email address (for contact information)
   * @param {string} email - Email address
   * @returns {string} - Validated email
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    return email.toLowerCase().trim();
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {string} - Validated URL
   */
  validateUrl(url) {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required');
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new ValidationError('URL must use HTTP or HTTPS protocol');
      }

      return urlObj.toString();
    } catch (error) {
      throw new ValidationError(`Invalid URL format: ${error.message}`);
    }
  }

  /**
   * Get validation rules summary
   * @returns {object} - Current validation rules
   */
  getValidationRules() {
    return { ...this.validationRules };
  }

  /**
   * Update validation rules
   * @param {object} newRules - New validation rules
   */
  updateValidationRules(newRules) {
    this.validationRules = { ...this.validationRules, ...newRules };
    this.logOperation('Validation rules updated', { 
      updatedKeys: Object.keys(newRules) 
    });
  }
}

module.exports = ValidationService;
