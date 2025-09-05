const AIServiceInterface = require('../base/ai-service.interface');
const OpenAI = require('openai');
const PromptService = require('../utilities/prompt.service');
const { OpenAIError } = require('../../src/utils/errors');
const fs = require('fs').promises;
const path = require('path');

/**
 * Content Service
 * Refactored HTML content generation service
 * Generates high-quality gambling website content using GPT-5-2025-08-07 with production architecture
 */
class ContentService extends AIServiceInterface {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    
    this.model = config.model || 'gpt-5-2025-08-07';
    this.client = new OpenAI({ apiKey });
    
    this.config = {
      maxRetries: 3,
      timeout: 1200000, // 20 minutes for content generation
      // temperature: removed - gpt-5-2025-08-07 only supports default (1)
      maxTokens: 128000, // Increased from 8000 to account for reasoning tokens
      promptsDirectory: config.promptsDirectory || './prompts',
      ...config
    };

    // Initialize prompt service
    this.promptService = new PromptService({
      promptsDirectory: this.config.promptsDirectory,
      cacheEnabled: config.cachePrompts !== false
    });
  }

  /**
   * Generate content (implements AIServiceInterface.generate)
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Generated content with metadata
   */
  async generate(params) {
    // Extract structure data if it comes from StructureService
    const extractedParams = this.extractFromChain(params);
    return await this.generateHTML(extractedParams);
  }

  /**
   * Process response from AI service (implements AIServiceInterface.processResponse)
   * @param {object} response - Raw API response
   * @returns {string} - Processed HTML content
   */
  processResponse(response) {
    return this.parseContentResponse(response);
  }

  /**
   * Generate complete HTML content based on structure
   * @param {object} params - Generation parameters including structure
   * @returns {Promise<object>} - Generated HTML content with metadata
   */
  async generateHTML(params) {
    this.logOperation('generateHTML', { 
      primaryKeyword: params.primaryKeyword,
      brandName: params.brandName,
      hasStructure: !!params.structure,
      isChainedInput: !!params.serviceType,
      model: this.model 
    });

    const startTime = Date.now();

    try {
      // Handle structure input from StructureService
      let structure = params.structure;
      if (params.serviceType === 'StructureService' && params.data) {
        this.logOperation('Using structure from StructureService', {
          structureSuccess: params.data.success,
          structureSections: params.data.structure?.structure?.sections?.length || 0
        });
        structure = params.data.structure;
        // Merge structure params with original params
        params = { ...params, ...params.data, structure };
      }

      this.validateRequired(params, ['primaryKeyword', 'brandName', 'structure']);

      const prompt = await this.buildContentPrompt(params);
      const response = await this.executeWithRetry(
        async () => await this.makeApiCall(prompt),
        'makeApiCall',
        this.config.maxRetries
      );

      const htmlContent = this.parseContentResponse(response);
      const duration = Date.now() - startTime;

      // Update usage statistics
      this.updateUsageStats({
        requests: 1,
        tokens: response.usage?.total_tokens || 0,
        successful: 1,
        contentLength: htmlContent.length
      });

      const result = {
        success: true,
        content: htmlContent,
        metadata: {
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.model,
          duration,
          contentLength: htmlContent.length,
          timestamp: new Date().toISOString()
        }
      };

      this.logOperation('HTML generation completed', { 
        duration,
        tokensUsed: response.usage?.total_tokens,
        contentLength: htmlContent.length
      });

      // Save raw HTML content for debugging/inspection
      await this.saveRawHTML(htmlContent, params);

      // Return result prepared for chaining to other services
      return this.prepareForChaining(result);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateUsageStats({ errors: 1 });
      this.logError('generateHTML', error, { params, duration });
      
      throw new OpenAIError(
        `HTML content generation failed: ${error.message}`, 
        this.model, 
        error.code
      );
    }
  }

  /**
   * Build content generation prompt using professional template
   * @param {object} params - Generation parameters
   * @returns {Promise<string>} - Generated prompt from template
   */
  async buildContentPrompt(params) {
    this.logOperation('buildContentPrompt', { 
      primaryKeyword: params.primaryKeyword,
      hasStructure: !!params.structure,
      usingTemplate: true 
    });

    try {
      // Use the professional content generation prompt template
      // Map variables to the exact format expected by the template (both UPPERCASE and kebab-case placeholders)
      const templateVariables = {
        PRIMARY_KEYWORD: params.primaryKeyword,
        'primary-keyword': params.primaryKeyword, // For kebab-case placeholders
        CANONICAL_URL: params.canonicalUrl || `https://${params.brandName.toLowerCase().replace(/\s+/g, '')}.com`,
        HREFLANG_URLS: JSON.stringify(params.hreflangUrls || {}),
        SECONDARY_KEYWORDS: (params.secondaryKeywords || []).join(', '),
        FOCUS_AREAS: (params.focusAreas || ['güvenlik', 'mobil', 'destek', 'bonus']).join(', ')
      };

      const prompt = await this.promptService.getContentGenerationPrompt(templateVariables);

      this.logOperation('Content prompt built from template', {
        promptLength: prompt.length,
        templateUsed: 'content-generation-prompt'
      });

      return prompt;

    } catch (error) {
      this.logError('buildContentPrompt', error);
      
      // Throw error instead of using fallback - all prompts should come from PromptService
      throw new Error(`Failed to load content generation prompt: ${error.message}. Ensure prompts/content-generation-prompt.md exists.`);
    }
  }

  /**
   * Make API call to OpenAI for content generation
   * @param {string} prompt - Generation prompt
   * @returns {Promise<object>} - API response
   */
  async makeApiCall(prompt) {
    try {
      this.logOperation('Making content API call', { 
        model: this.model, 
        promptLength: prompt.length,
        maxTokens: this.config.maxTokens
      });

      console.log('🔧 About to make OpenAI API call...');
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_completion_tokens: this.config.maxTokens
        // temperature: removed - gpt-5-2025-08-07 only supports default (1)
      });

      console.log('✅ OpenAI API call completed');

      this.logOperation('Content API call successful', { 
        tokensUsed: response.usage?.total_tokens,
        responseLength: response.choices[0]?.message?.content?.length || 0
      });

      return response;

    } catch (error) {
      this.logError('Content API call failed', error, { model: this.model });
      throw new OpenAIError(`Content API call failed: ${error.message}`, this.model, error.code);
    }
  }

  /**
   * Parse and validate content response
   * @param {object} response - OpenAI API response
   * @returns {string} - Parsed HTML content
   */
  parseContentResponse(response) {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in API response');
      }

      // Clean up the content (remove markdown code blocks if present)
      let htmlContent = content.trim();
      if (htmlContent.startsWith('```html')) {
        htmlContent = htmlContent.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (htmlContent.startsWith('```')) {
        htmlContent = htmlContent.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      // Basic HTML validation
      this.validateHTMLContent(htmlContent);
      
      this.logOperation('Content parsed successfully', {
        contentLength: htmlContent.length,
        hasDoctype: htmlContent.includes('<!DOCTYPE'),
        hasHtmlTag: htmlContent.includes('<html'),
        hasHeadTag: htmlContent.includes('<head>'),
        hasBodyTag: htmlContent.includes('<body>')
      });

      return htmlContent;

    } catch (error) {
      this.logError('Content parsing failed', error);
      throw new Error(`Failed to parse content response: ${error.message}`);
    }
  }

  /**
   * Basic HTML content validation
   * @param {string} htmlContent - HTML content to validate
   */
  validateHTMLContent(htmlContent) {
    const requiredElements = [
      { tag: '<!DOCTYPE', name: 'DOCTYPE declaration' },
      { tag: '<html', name: 'HTML tag' },
      { tag: '<head>', name: 'HEAD tag' },
      { tag: '<body>', name: 'BODY tag' },
      { tag: '<title>', name: 'TITLE tag' }
    ];

    const missing = requiredElements.filter(element => 
      !htmlContent.includes(element.tag)
    );

    if (missing.length > 0) {
      throw new Error(`Missing required HTML elements: ${missing.map(m => m.name).join(', ')}`);
    }

    if (htmlContent.length < 1000) {
      throw new Error('Generated content is too short (minimum 1000 characters)');
    }
  }

  /**
   * Parse image references from HTML content
   * @param {string} htmlContent - HTML content to parse
   * @returns {Array} - Array of image references
   */
  parseImageReferences(htmlContent) {
    this.logOperation('Parsing image references from HTML content');

    const imageReferences = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
      imageReferences.push({
        src: match[1],
        altText: match[2],
        originalTag: match[0]
      });
    }

    this.logOperation('Image references parsed', { 
      totalImages: imageReferences.length,
      imageFiles: imageReferences.map(img => img.src)
    });

    return imageReferences;
  }

  /**
   * Optimize HTML content for performance
   * @param {string} htmlContent - HTML content to optimize
   * @returns {string} - Optimized HTML content
   */
  optimizeContent(htmlContent) {
    this.logOperation('Optimizing HTML content');

    let optimized = htmlContent;

    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ');
    
    // Remove comments (keep IE conditionals)
    optimized = optimized.replace(/<!--(?!\[if).*?-->/g, '');
    
    // Optimize meta tags order
    // (This would be more sophisticated in a real implementation)
    
    this.logOperation('Content optimization completed', {
      originalSize: htmlContent.length,
      optimizedSize: optimized.length,
      reduction: Math.round(((htmlContent.length - optimized.length) / htmlContent.length) * 100)
    });

    return optimized;
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} - True if API key is valid
   */
  async validateApiKey() {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update usage statistics
   * @param {object} stats - Statistics to add
   */
  updateUsageStats(stats) {
    if (stats.requests) this.usageStats.totalRequests += stats.requests;
    if (stats.tokens) this.usageStats.totalTokens += stats.tokens;
    if (stats.errors) this.usageStats.errors += stats.errors;
    if (stats.successful) this.usageStats.successfulRequests += stats.successful;
    
    if (stats.contentLength) {
      const totalSuccessful = this.usageStats.successfulRequests;
      this.usageStats.averageContentLength = totalSuccessful > 1
        ? Math.round((this.usageStats.averageContentLength * (totalSuccessful - 1) + stats.contentLength) / totalSuccessful)
        : stats.contentLength;
    }
  }

  /**
   * Get usage statistics
   * @returns {object} - Current usage statistics
   */
  getUsageStats() {
    return { 
      ...this.usageStats,
      successRate: this.usageStats.totalRequests > 0 
        ? Math.round((this.usageStats.successfulRequests / this.usageStats.totalRequests) * 100)
        : 0
    };
  }

  /**
   * Get model information
   * @returns {object} - Model details
   */
  getModelInfo() {
    return {
      name: this.model,
      type: 'text-generation',
      maxTokens: this.config.maxTokens,
      // temperature: removed - gpt-5-2025-08-07 only supports default (1)
      provider: 'OpenAI',
      specialization: 'Long-form content generation'
    };
  }

  /**
   * Get cost estimation
   * @returns {object} - Cost estimation
   */
  getCostEstimation() {
    const costPer1KTokens = 0.01; // Example rate for GPT-5-2025-08-07
    const estimatedCost = (this.usageStats.totalTokens / 1000) * costPer1KTokens;
    
    return {
      totalTokens: this.usageStats.totalTokens,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      currency: 'USD',
      model: this.model
    };
  }

  /**
   * Get prompt service statistics
   * @returns {Promise<object>} - Prompt service stats
   */
  async getPromptStats() {
    try {
      const cacheStats = this.promptService.getCacheStats();
      const validation = await this.promptService.validatePrompt('content-generation-prompt');
      
      return {
        promptService: cacheStats,
        templateValidation: validation,
        templateInUse: 'content-generation-prompt'
      };
    } catch (error) {
      this.logError('getPromptStats', error);
      return {
        error: error.message,
        fallbackMode: true
      };
    }
  }

  /**
   * Validate content generation prompt template
   * @returns {Promise<object>} - Validation results
   */
  async validatePromptTemplate() {
    this.logOperation('validatePromptTemplate');
    
    try {
      const validation = await this.promptService.validatePrompt('content-generation-prompt');
      
      this.logOperation('Prompt template validation completed', {
        isValid: validation.isValid,
        issues: validation.issues?.length || 0
      });
      
      return validation;
    } catch (error) {
      this.logError('validatePromptTemplate', error);
      return {
        isValid: false,
        error: error.message,
        recommendedAction: 'Check if prompts/content-generation-prompt.md exists'
      };
    }
  }

  /**
   * Save raw HTML content to file for debugging and inspection
   * @param {string} htmlContent - The generated HTML content
   * @param {object} params - Generation parameters for folder naming
   */
  async saveRawHTML(htmlContent, params) {
    try {
      // Create output directory path with primaryKeyword and date
      const primaryKeyword = params.primaryKeyword || 'content';
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Create raw.html file path
      const rawHtmlPath = path.join(outputDir, 'raw.html');
      
      // Save HTML content
      await fs.writeFile(rawHtmlPath, htmlContent, 'utf8');
      
      this.logOperation('Raw HTML saved for inspection', {
        filePath: rawHtmlPath,
        contentLength: htmlContent.length,
        outputDir
      });
      
    } catch (error) {
      this.logError('saveRawHTML', error, {
        primaryKeyword: params.primaryKeyword,
        contentLength: htmlContent?.length || 0
      });
      // Don't throw error - this is just for debugging, shouldn't break the workflow
    }
  }
}

module.exports = ContentService;
