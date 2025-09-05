/**
 * Input Abstraction Layer for HTML Generator
 * Provides standardized interface for API and UI integration
 */

/**
 * Standard input parameters for website generation
 * @typedef {Object} GenerationInput
 * @property {string} primaryKeyword - Main SEO keyword for the website
 * @property {string} brandName - Brand/company name
 * @property {string[]} [secondaryKeywords] - Additional SEO keywords
 * @property {string[]} [focusAreas] - Areas of focus (e.g., security, mobile, support)
 * @property {string} [canonicalUrl] - Canonical URL for the website
 * @property {Object} [hreflangUrls] - Hreflang URLs for different languages
 * @property {string} [outputDir] - Output directory for generated files
 * @property {string} [targetLanguage] - Target language code (default: 'tr')
 * @property {string} [businessType] - Type of business (default: 'online betting platform')
 * @property {string} [targetAudience] - Target audience description
 * @property {Object} [seoSettings] - Advanced SEO configuration
 * @property {Object} [designPreferences] - Design and layout preferences
 * @property {Object} [contentSettings] - Content generation settings
 */

/**
 * Input validator and normalizer
 */
class InputProcessor {
  constructor() {
    this.defaults = {
      secondaryKeywords: [],
      focusAreas: ['güvenlik', 'mobil', 'destek', 'bonus'],
      targetLanguage: 'tr',
      businessType: 'online betting platform',
      targetAudience: 'Turkish betting enthusiasts',
      outputDir: './output',
      seoSettings: {
        includeStructuredData: true,
        optimizeForMobile: true,
        includeHreflang: true
      },
      designPreferences: {
        style: 'modern',
        colorScheme: 'professional',
        layout: 'responsive'
      },
      contentSettings: {
        tone: 'trustworthy_professional',
        length: 'comprehensive',
        includeTestimonials: true,
        includeFAQ: true
      }
    };

    this.requiredFields = ['primaryKeyword', 'brandName', 'canonicalUrl', 'hreflangUrls'];
    
    this.validationRules = {
      primaryKeyword: {
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s-]+$/
      },
      brandName: {
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9\s\-._]+$/
      },
      canonicalUrl: {
        pattern: /^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/,
        required: true
      },
      hreflangUrls: {
        required: true,
        type: 'object'
      },
      secondaryKeywords: {
        maxItems: 10,
        itemMaxLength: 30
      },
      focusAreas: {
        maxItems: 8,
        allowedValues: [
          'güvenlik', 'mobil', 'destek', 'bonus', 'hızlı', 'casino', 
          'spor', 'canlı', 'ödeme', 'lisans', 'vip', 'promosyon'
        ]
      },
      targetLanguage: {
        allowedValues: ['tr', 'en', 'de', 'fr', 'es', 'ru']
      }
    };
  }

  /**
   * Process and validate input parameters
   * @param {Object} rawInput - Raw input parameters
   * @returns {GenerationInput} - Processed and validated input
   * @throws {ValidationError} - If validation fails
   */
  process(rawInput) {
    // Step 1: Validate required fields
    this.validateRequired(rawInput);
    
    // Step 2: Normalize and apply defaults first
    const processedInput = this.normalize(rawInput);
    
    // Step 3: Validate field formats after normalization
    this.validateFormats(processedInput);
    
    // Step 4: Generate derived fields
    const enrichedInput = this.enrich(processedInput);
    
    return enrichedInput;
  }

  /**
   * Validate required fields
   * @param {Object} input - Input to validate
   * @throws {ValidationError} - If required fields missing
   */
  validateRequired(input) {
    const missing = this.requiredFields.filter(field => !input[field]);
    if (missing.length > 0) {
      throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate field formats and constraints
   * @param {Object} input - Input to validate
   * @throws {ValidationError} - If validation fails
   */
  validateFormats(input) {
    for (const [field, value] of Object.entries(input)) {
      if (value === undefined || value === null) continue;
      
      const rules = this.validationRules[field];
      if (!rules) continue;

      // String validation
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          throw new ValidationError(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          throw new ValidationError(`${field} must not exceed ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          throw new ValidationError(`${field} contains invalid characters`);
        }
        if (rules.allowedValues && !rules.allowedValues.includes(value)) {
          throw new ValidationError(`${field} must be one of: ${rules.allowedValues.join(', ')}`);
        }
      }

      // Array validation
      if (Array.isArray(value)) {
        if (rules.maxItems && value.length > rules.maxItems) {
          throw new ValidationError(`${field} cannot have more than ${rules.maxItems} items`);
        }
        if (rules.itemMaxLength) {
          const invalidItems = value.filter(item => item.length > rules.itemMaxLength);
          if (invalidItems.length > 0) {
            throw new ValidationError(`${field} items too long: ${invalidItems.join(', ')}`);
          }
        }
        if (rules.allowedValues) {
          const invalidItems = value.filter(item => !rules.allowedValues.includes(item));
          if (invalidItems.length > 0) {
            throw new ValidationError(`${field} contains invalid values: ${invalidItems.join(', ')}`);
          }
        }
      }
    }
  }

  /**
   * Normalize input and apply defaults
   * @param {Object} input - Raw input
   * @returns {GenerationInput} - Normalized input
   */
  normalize(input) {
    const normalized = { ...input };

    // Apply defaults for missing optional fields
    Object.entries(this.defaults).forEach(([key, defaultValue]) => {
      if (normalized[key] === undefined) {
        normalized[key] = Array.isArray(defaultValue) ? [...defaultValue] : 
                         typeof defaultValue === 'object' ? { ...defaultValue } : 
                         defaultValue;
      }
    });

    // Normalize arrays from strings
    if (typeof normalized.secondaryKeywords === 'string') {
      normalized.secondaryKeywords = normalized.secondaryKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }

    if (typeof normalized.focusAreas === 'string') {
      normalized.focusAreas = normalized.focusAreas
        .split(',')
        .map(area => area.trim())
        .filter(area => area.length > 0);
    }

    // Normalize hreflang URLs
    if (typeof normalized.hreflangUrls === 'string') {
      try {
        normalized.hreflangUrls = JSON.parse(normalized.hreflangUrls);
      } catch (error) {
        throw new ValidationError('Invalid hreflangUrls JSON format');
      }
    }

    // Generate canonical URL if not provided
    if (!normalized.canonicalUrl) {
      const cleanBrandName = normalized.brandName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      normalized.canonicalUrl = `https://${cleanBrandName}.com`;
    }

    return normalized;
  }

  /**
   * Enrich input with derived fields
   * @param {GenerationInput} input - Normalized input
   * @returns {GenerationInput} - Enriched input
   */
  enrich(input) {
    const enriched = { ...input };

    // Generate output directory with timestamp
    const date = new Date().toISOString().split('T')[0];
    const cleanKeyword = input.primaryKeyword
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 20);
    
    enriched.outputDir = enriched.outputDir.replace('./output', 
      `./output/${cleanKeyword}-${date}`);

    // Add metadata
    enriched._metadata = {
      processedAt: new Date().toISOString(),
      version: '1.0.0',
      inputHash: this.generateInputHash(input)
    };

    return enriched;
  }

  /**
   * Generate hash for input caching
   * @param {Object} input - Input to hash
   * @returns {string} - Hash string
   */
  generateInputHash(input) {
    const hashData = {
      primaryKeyword: input.primaryKeyword,
      secondaryKeywords: input.secondaryKeywords?.sort() || [],
      focusAreas: input.focusAreas?.sort() || [],
      targetLanguage: input.targetLanguage
    };
    
    return Buffer.from(JSON.stringify(hashData))
      .toString('base64')
      .substring(0, 16);
  }

  /**
   * Convert input to CLI arguments
   * @param {GenerationInput} input - Processed input
   * @returns {string[]} - Array of CLI arguments
   */
  toCLIArgs(input) {
    const args = [];
    
    args.push('--primary-keyword', input.primaryKeyword);
    args.push('--brand-name', input.brandName);
    
    if (input.canonicalUrl) {
      args.push('--canonical-url', input.canonicalUrl);
    }
    
    if (input.secondaryKeywords?.length > 0) {
      args.push('--secondary-keywords', input.secondaryKeywords.join(','));
    }
    
    if (input.focusAreas?.length > 0) {
      args.push('--focus-areas', input.focusAreas.join(','));
    }
    
    if (input.hreflangUrls && Object.keys(input.hreflangUrls).length > 0) {
      args.push('--hreflang-urls', JSON.stringify(input.hreflangUrls));
    }
    
    return args;
  }

  /**
   * Get input schema for API documentation
   * @returns {Object} - JSON schema
   */
  getSchema() {
    return {
      type: 'object',
      required: this.requiredFields,
      properties: {
        primaryKeyword: {
          type: 'string',
          minLength: this.validationRules.primaryKeyword.minLength,
          maxLength: this.validationRules.primaryKeyword.maxLength,
          description: 'Main SEO keyword for the website',
          example: 'Paribahis'
        },
        brandName: {
          type: 'string',
          minLength: this.validationRules.brandName.minLength,
          maxLength: this.validationRules.brandName.maxLength,
          description: 'Brand or company name',
          example: 'Paribahis Resmi'
        },
        secondaryKeywords: {
          type: 'array',
          items: { type: 'string', maxLength: 30 },
          maxItems: this.validationRules.secondaryKeywords.maxItems,
          description: 'Additional SEO keywords',
          example: ['bahis', 'casino', 'spor']
        },
        focusAreas: {
          type: 'array',
          items: { 
            type: 'string',
            enum: this.validationRules.focusAreas.allowedValues
          },
          maxItems: this.validationRules.focusAreas.maxItems,
          description: 'Areas of focus for the website',
          example: ['güvenlik', 'mobil', 'bonus']
        },
        canonicalUrl: {
          type: 'string',
          format: 'uri',
          description: 'Canonical URL for the website',
          example: 'https://paribahis.com'
        },
        hreflangUrls: {
          type: 'object',
          additionalProperties: { type: 'string', format: 'uri' },
          description: 'Hreflang URLs for different languages',
          example: {
            'tr': 'https://tr.paribahis.com',
            'en': 'https://en.paribahis.com'
          }
        },
        targetLanguage: {
          type: 'string',
          enum: this.validationRules.targetLanguage.allowedValues,
          description: 'Target language code',
          default: 'tr'
        }
      }
    };
  }
}

/**
 * Validation Error class
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = {
  InputProcessor,
  ValidationError
};
