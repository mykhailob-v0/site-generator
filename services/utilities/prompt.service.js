const BaseService = require('../base/base.service');
const fs = require('fs').promises;
const path = require('path');

/**
 * Prompt Service
 * Manages loading and processing of prompt templates from the prompts/ directory
 * Provides template variable substitution and prompt optimization
 */
class PromptService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      promptsDirectory: config.promptsDirectory || './prompts',
      cacheEnabled: config.cacheEnabled !== false,
      encoding: config.encoding || 'utf8',
      ...config
    };

    this.promptCache = new Map();
    this.templateVariables = new Map();
  }

  /**
   * Load prompt template from file
   * @param {string} promptName - Name of the prompt file (without extension)
   * @returns {Promise<string>} - Raw prompt content
   */
  async loadPrompt(promptName) {
    this.logOperation('loadPrompt', { promptName, cacheEnabled: this.config.cacheEnabled });

    try {
      // Check cache first
      if (this.config.cacheEnabled && this.promptCache.has(promptName)) {
        this.logOperation('Prompt loaded from cache', { promptName });
        return this.promptCache.get(promptName);
      }

      // Construct file path
      const promptPath = path.join(this.config.promptsDirectory, `${promptName}.md`);
      
      // Load and cache prompt
      const promptContent = await fs.readFile(promptPath, this.config.encoding);
      
      if (this.config.cacheEnabled) {
        this.promptCache.set(promptName, promptContent);
      }

      this.logOperation('Prompt loaded from file', { 
        promptName, 
        path: promptPath,
        contentLength: promptContent.length 
      });

      return promptContent;

    } catch (error) {
      this.logError('loadPrompt', error, { promptName });
      throw new Error(`Failed to load prompt '${promptName}': ${error.message}`);
    }
  }

  /**
   * Process prompt template with variable substitution
   * @param {string} promptName - Name of the prompt template
   * @param {object} variables - Variables to substitute in the template
   * @returns {Promise<string>} - Processed prompt with variables substituted
   */
  async processPrompt(promptName, variables = {}) {
    this.logOperation('processPrompt', { 
      promptName, 
      variableCount: Object.keys(variables).length,
      variables: Object.keys(variables)
    });

    try {
      const rawPrompt = await this.loadPrompt(promptName);
      const processedPrompt = this.substituteVariables(rawPrompt, variables);

      this.logOperation('Prompt processed successfully', {
        promptName,
        originalLength: rawPrompt.length,
        processedLength: processedPrompt.length,
        substitutions: this.getSubstitutionCount(rawPrompt, variables)
      });

      return processedPrompt;

    } catch (error) {
      this.logError('processPrompt', error, { promptName, variables });
      throw new Error(`Failed to process prompt '${promptName}': ${error.message}`);
    }
  }

  /**
   * Substitute variables in prompt template
   * @param {string} template - Prompt template content
   * @param {object} variables - Variables to substitute
   * @returns {string} - Template with variables substituted
   */
  substituteVariables(template, variables) {
    let processed = template;

    // Substitute variables in {VARIABLE_NAME} format
    Object.entries(variables).forEach(([key, value]) => {
      // Use the key as-is if it contains dashes (kebab-case), otherwise uppercase it
      const templateKey = key.includes('-') ? key : key.toUpperCase();
      const pattern = new RegExp(`\\{${templateKey}\\}`, 'g');
      const substitutionValue = this.formatVariableValue(value);
      processed = processed.replace(pattern, substitutionValue);
    });

    // Handle special formatting for complex variables
    processed = this.handleSpecialVariables(processed, variables);

    return processed;
  }

  /**
   * Format variable value for substitution
   * @param {any} value - Variable value to format
   * @returns {string} - Formatted value
   */
  formatVariableValue(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  }

  /**
   * Handle special variable formatting (like hreflang URLs)
   * @param {string} template - Template content
   * @param {object} variables - Variables object
   * @returns {string} - Template with special variables processed
   */
  handleSpecialVariables(template, variables) {
    let processed = template;

    // Handle HREFLANG_URLS special formatting
    if (variables.hreflangUrls && typeof variables.hreflangUrls === 'object') {
      const hreflangTags = Object.entries(variables.hreflangUrls)
        .map(([lang, url]) => `<link rel="alternate" hreflang="${lang}" href="${url}">`)
        .join('\n');
      
      processed = processed.replace(/\{HREFLANG_URLS\}/g, hreflangTags);
    }

    // Handle FOCUS_AREAS formatting
    if (variables.focusAreas && Array.isArray(variables.focusAreas)) {
      const focusAreasText = variables.focusAreas.join(', ');
      processed = processed.replace(/\{FOCUS_AREAS\}/g, focusAreasText);
    }

    // Handle SECONDARY_KEYWORDS formatting
    if (variables.secondaryKeywords && Array.isArray(variables.secondaryKeywords)) {
      const keywordsText = variables.secondaryKeywords.join(', ');
      processed = processed.replace(/\{SECONDARY_KEYWORDS\}/g, keywordsText);
    }

    return processed;
  }

  /**
   * Get count of substitutions made
   * @param {string} template - Original template
   * @param {object} variables - Variables used
   * @returns {number} - Number of substitutions made
   */
  getSubstitutionCount(template, variables) {
    let count = 0;
    
    Object.keys(variables).forEach(key => {
      const pattern = new RegExp(`\\{${key.toUpperCase()}\\}`, 'g');
      const matches = template.match(pattern);
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  /**
   * Get content generation prompt with variables
   * @param {object} params - Content generation parameters
   * @returns {Promise<string>} - Processed content generation prompt
   */
  async getContentGenerationPrompt(params) {
    this.logOperation('getContentGenerationPrompt', { 
      hasStructure: !!params.structure,
      hasSTRUCTURE: !!params.STRUCTURE,
      primaryKeyword: params.primaryKeyword,
      structureKeys: params.STRUCTURE ? Object.keys(params.STRUCTURE) : (params.structure ? Object.keys(params.structure) : [])
    });

    // Map variables to the exact format expected by the template (both UPPERCASE and kebab-case)
    const variables = {
      PRIMARY_KEYWORD: params.PRIMARY_KEYWORD || params.primaryKeyword || 'bahis',
      'primary-keyword': params['primary-keyword'] || params.primaryKeyword || 'bahis',
      SECONDARY_KEYWORDS: params.SECONDARY_KEYWORDS || (Array.isArray(params.secondaryKeywords) ? params.secondaryKeywords.join(', ') : ''),
      CANONICAL_URL: params.CANONICAL_URL || params.canonicalUrl || 'https://example.com',
      HREFLANG_URLS: params.HREFLANG_URLS || (typeof params.hreflangUrls === 'object' ? JSON.stringify(params.hreflangUrls) : '{}'),
      FOCUS_AREAS: params.FOCUS_AREAS || (Array.isArray(params.focusAreas) ? params.focusAreas.join(', ') : 'güvenlik, mobil, destek'),
      STRUCTURE: params.STRUCTURE || params.structure || {}, // Add STRUCTURE variable mapping for template
      brandName: params.brandName || 'Bahis Sitesi',
      structure: params.structure || {}, // Keep for backward compatibility
      targetLanguage: params.targetLanguage || 'tr'
    };

    return await this.processPrompt('content-generation-prompt', variables);
  }

  /**
   * Get structure generation prompt with variables
   * @param {object} params - Structure generation parameters
   * @returns {Promise<string>} - Processed structure generation prompt
   */
  async getStructureGenerationPrompt(params) {
    this.logOperation('getStructureGenerationPrompt', { 
      primaryKeyword: params.primaryKeyword 
    });

    const variables = {
      primaryKeyword: params.primaryKeyword || 'bahis',
      secondaryKeywords: params.secondaryKeywords || [],
      targetAudience: params.targetAudience || 'Turkish betting enthusiasts',
      businessType: params.businessType || 'online betting platform',
      contentType: params.contentType || 'landing page'
    };

    return await this.processPrompt('structure-generation-prompt', variables);
  }

  /**
   * Get image generation prompt with variables
   * @param {object} params - Image generation parameters
   * @returns {Promise<string>} - Processed image generation prompt
   */
  async getImageGenerationPrompt(params) {
    this.logOperation('getImageGenerationPrompt', { 
      imageType: params.imageType,
      primaryKeyword: params.primaryKeyword 
    });

    const variables = {
      primaryKeyword: params.primaryKeyword || 'bahis',
      imageType: params.imageType || 'hero',
      brandName: params.brandName || 'Bahis Sitesi',
      style: params.style || 'modern, professional',
      colorScheme: params.colorScheme || 'dark blue, gold, white',
      targetAudience: params.targetAudience || 'Turkish betting enthusiasts'
    };

    return await this.processPrompt('image-generation-prompt', variables);
  }

  /**
   * Get master prompt (system-level instructions)
   * @param {object} params - Master prompt parameters
   * @returns {Promise<string>} - Processed master prompt
   */
  async getMasterPrompt(params = {}) {
    this.logOperation('getMasterPrompt');

    const variables = {
      systemRole: params.systemRole || 'expert content generator',
      targetLanguage: params.targetLanguage || 'Turkish',
      compliance: params.compliance || 'E-E-A-T and YMYL standards',
      industry: params.industry || 'gambling and betting'
    };

    return await this.processPrompt('master-prompt', variables);
  }

  /**
   * Clear prompt cache
   */
  clearCache() {
    this.promptCache.clear();
    this.logOperation('Prompt cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getCacheStats() {
    return {
      cacheEnabled: this.config.cacheEnabled,
      cachedPrompts: this.promptCache.size,
      promptNames: Array.from(this.promptCache.keys())
    };
  }

  /**
   * Validate prompt template
   * @param {string} promptName - Name of prompt to validate
   * @returns {Promise<object>} - Validation result
   */
  async validatePrompt(promptName) {
    this.logOperation('validatePrompt', { promptName });

    try {
      const prompt = await this.loadPrompt(promptName);
      
      const validation = {
        isValid: true,
        contentLength: prompt.length,
        variableCount: this.countVariables(prompt),
        variables: this.extractVariables(prompt),
        issues: []
      };

      // Check for common issues
      if (prompt.length < 100) {
        validation.issues.push('Prompt content is very short');
      }

      if (validation.variableCount === 0) {
        validation.issues.push('No template variables found');
      }

      validation.isValid = validation.issues.length === 0;

      this.logOperation('Prompt validation completed', {
        promptName,
        isValid: validation.isValid,
        issues: validation.issues.length
      });

      return validation;

    } catch (error) {
      this.logError('validatePrompt', error, { promptName });
      return {
        isValid: false,
        error: error.message,
        issues: ['Failed to load prompt file']
      };
    }
  }

  /**
   * Count variables in template
   * @param {string} template - Template content
   * @returns {number} - Number of variables
   */
  countVariables(template) {
    const variablePattern = /\{[A-Z_]+\}/g;
    const matches = template.match(variablePattern);
    return matches ? matches.length : 0;
  }

  /**
   * Extract variable names from template
   * @param {string} template - Template content
   * @returns {Array<string>} - Array of variable names
   */
  extractVariables(template) {
    const variablePattern = /\{([A-Z_]+)\}/g;
    const variables = new Set();
    let match;

    while ((match = variablePattern.exec(template)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }
}

module.exports = PromptService;
