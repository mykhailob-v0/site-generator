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
    // Check if this is chained input from StructureService before extraction
    if (params.serviceType && params.data) {
      this.logOperation('Received chained input from StructureService', {
        serviceType: params.serviceType,
        hasStructure: !!params.data.structure
      });
      
      // Merge the structure data with original params, preserving the structure
      const mergedParams = {
        ...params, // Original params from orchestrator (primaryKeyword, etc.)
        ...params.data, // Contains { success: true, structure, metadata }
        structure: params.data.structure // Ensure structure is properly set at root level
      };
      
      return await this.generateHTML(mergedParams);
    }
    
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
    // Get the actual structure object for logging - handle deeply nested structure
    let actualStructure = params.structure;
    if (actualStructure && actualStructure.data && actualStructure.data.structure) {
      actualStructure = actualStructure.data.structure;
    }
    if (actualStructure && actualStructure.structure) {
      actualStructure = actualStructure.structure;
    }
    
    this.logOperation('generateHTML', { 
      primaryKeyword: params.primaryKeyword,
      brandName: params.brandName,
      hasStructure: !!actualStructure,
      structureSections: actualStructure?.sections?.length || 0,
      model: this.model 
    });

    const startTime = Date.now();

    try {
      this.validateRequired(params, ['primaryKeyword', 'brandName', 'structure']);

      const prompt = await this.buildContentPrompt(params);
      const response = await this.executeWithRetry(
        async () => await this.makeApiCall(prompt),
        'makeApiCall',
        this.config.maxRetries
      );

      // Save raw response immediately, even before validation
      const rawContent = response.choices[0]?.message?.content;
      if (rawContent) {
        await this.saveRawHTML(rawContent, params, 'raw-response');
      }

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

      // Save processed HTML content for debugging/inspection (even if validation failed)
      await this.saveRawHTML(htmlContent, params, 'processed');

      // Return result prepared for chaining to other services
      return this.prepareForChaining(result);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Try to save raw response even if there was an error
      try {
        const rawContent = error.response?.choices?.[0]?.message?.content || 
                          error.rawResponse?.choices?.[0]?.message?.content;
        if (rawContent) {
          await this.saveRawHTML(rawContent, params, 'error-response');
        }
      } catch (saveError) {
        this.logError(saveError, { operation: 'saveErrorResponse' });
      }
      
      this.updateUsageStats({ errors: 1 });
      this.logError(error, { operation: 'generateHTML', params, duration });
      
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
    // Get the actual structure object - handle deeply nested structure
    let actualStructure = params.structure;
    
    // Handle multiple levels of nesting that can occur in service chaining
    if (actualStructure && actualStructure.data && actualStructure.data.structure) {
      actualStructure = actualStructure.data.structure;
    }
    if (actualStructure && actualStructure.structure) {
      actualStructure = actualStructure.structure;
    }
    
    // Select appropriate template based on needImages parameter
    const templateName = params.needImages ? 'content-generation-prompt' : 'no-images-content-generation-prompt';
    
    this.logOperation('buildContentPrompt', { 
      primaryKeyword: params.primaryKeyword,
      hasStructure: !!actualStructure,
      structureSections: actualStructure?.sections?.length || 0,
      usingTemplate: templateName,
      needImages: params.needImages 
    });

    console.log('Structure access debug:', {
      hasParamsStructure: !!params.structure,
      structureKeys: params.structure ? Object.keys(params.structure) : null,
      hasDataStructure: !!(params.structure?.data?.structure),
      hasNestedStructure: !!(params.structure?.data?.structure?.structure),
      finalSections: actualStructure?.sections?.length || 0,
      templateSelected: templateName,
      needImages: params.needImages
    });

    try {
      // Use the appropriate content generation prompt template based on needImages parameter
      // Map variables to the exact format expected by the template (both UPPERCASE and kebab-case placeholders)
      const templateVariables = {
        PRIMARY_KEYWORD: params.primaryKeyword,
        'primary-keyword': params.primaryKeyword, // For kebab-case placeholders
        CANONICAL_URL: params.canonicalUrl || `https://${params.brandName.toLowerCase().replace(/\s+/g, '')}.com`,
        HREFLANG_URLS: JSON.stringify(params.hreflangUrls || {}),
        SECONDARY_KEYWORDS: (params.secondaryKeywords || []).join(', '),
        FOCUS_AREAS: (params.focusAreas || ['güvenlik', 'mobil', 'destek', 'bonus']).join(', '),
        STRUCTURE: JSON.stringify(actualStructure, null, 2) // Add actual structure to template variables
      };

      // Get the appropriate prompt based on needImages parameter
      const prompt = params.needImages 
        ? await this.promptService.getContentGenerationPrompt(templateVariables)
        : await this.promptService.getNoImagesContentGenerationPrompt(templateVariables);

      this.logOperation('Content prompt built from template', {
        promptLength: prompt.length,
        templateUsed: templateName,
        structureIncluded: !!templateVariables.STRUCTURE,
        structureSections: actualStructure?.sections?.length || 0,
        needImages: params.needImages
      });

      console.log('Prompt preview:', JSON.stringify(prompt, null, 2));

      return prompt;

    } catch (error) {
      this.logError(error, { operation: 'buildContentPrompt', templateName });
      
      // Throw error instead of using fallback - all prompts should come from PromptService
      throw new Error(`Failed to load content generation prompt (${templateName}): ${error.message}. Ensure prompts/${templateName}.md exists.`);
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

      console.log('🔧 OpenAI API call...');
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user', 
            content: JSON.stringify(prompt, null, 2)
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
      this.logError(error, { operation: 'Content API call failed', model: this.model });
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

      // Basic HTML validation - but don't fail the process
      try {
        this.validateHTMLContent(htmlContent);
      } catch (validationError) {
        // Log the validation error but don't throw it - we want to save the content anyway
        this.logOperation('HTML validation failed but proceeding', {
          validationError: validationError.message,
          contentLength: htmlContent.length,
          contentPreview: htmlContent.substring(0, 200) + '...'
        });
        
        // Add a comment to the HTML indicating validation issues
        htmlContent = `<!-- HTML Validation Warning: ${validationError.message} -->\n${htmlContent}`;
      }
      
      this.logOperation('Content parsed successfully', {
        contentLength: htmlContent.length,
        hasDoctype: htmlContent.includes('<!DOCTYPE'),
        hasHtmlTag: htmlContent.includes('<html'),
        hasHeadTag: htmlContent.includes('<head>'),
        hasBodyTag: htmlContent.includes('<body>')
      });

      return htmlContent;

    } catch (error) {
      this.logError(error, { operation: 'Content parsing failed' });
      throw new Error(`Failed to parse content response: ${error.message}`);
    }
  }

  /**
   * Basic HTML content validation
   * @param {string} htmlContent - HTML content to validate
   */
  validateHTMLContent(htmlContent) {
    // Log content preview for debugging
    this.logOperation('Validating HTML content', {
      contentLength: htmlContent.length,
      startsWithDoctype: htmlContent.trim().startsWith('<!DOCTYPE'),
      containsHtml: htmlContent.includes('<html'),
      containsHead: htmlContent.includes('<head'),
      containsBody: htmlContent.includes('<body'),
      contentPreview: htmlContent.substring(0, 200) + '...'
    });

    const requiredElements = [
      { tag: '<!DOCTYPE', name: 'DOCTYPE declaration' },
      { tag: '<html', name: 'HTML tag' },
      { tag: '<head', name: 'HEAD tag' }, // More flexible - allows <head> or <head ...>
      { tag: '<title>', name: 'TITLE tag' }
    ];

    // Check for body tag more flexibly
    const hasBodyTag = htmlContent.includes('<body>') || htmlContent.includes('<body ');
    
    const missing = requiredElements.filter(element => 
      !htmlContent.includes(element.tag)
    );

    if (!hasBodyTag) {
      this.logOperation('Missing body tag, but content may still be valid', {
        hasMainContent: htmlContent.includes('<main>'),
        hasArticleContent: htmlContent.includes('<article>'),
        hasDivContent: htmlContent.includes('<div'),
        contentLength: htmlContent.length
      });
      
      // Only throw error if content is truly empty or malformed
      if (htmlContent.length < 500) {
        throw new Error('Generated content appears to be incomplete (less than 500 characters)');
      }
      
      // Don't fail for missing body tag if we have substantial content
      console.warn('⚠️ Generated HTML missing <body> tag but has substantial content. Proceeding...');
    }

    if (missing.length > 0) {
      // Only fail for critical missing elements
      const criticalMissing = missing.filter(m => m.tag === '<!DOCTYPE' || m.tag === '<html');
      if (criticalMissing.length > 0) {
        throw new Error(`Missing critical HTML elements: ${criticalMissing.map(m => m.name).join(', ')}`);
      }
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
      this.logError(error, { operation: 'getPromptStats' });
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
      this.logError(error, { operation: 'validatePromptTemplate' });
      return {
        isValid: false,
        error: error.message,
        recommendedAction: 'Check if prompts/content-generation-prompt.md exists'
      };
    }
  }

  /**
   * Copy brand-specific assets to output directory
   * @param {string} outputDir - Output directory path
   * @param {string} primaryKeyword - Primary keyword to check for brand
   */
  async copyBrandAssets(outputDir, primaryKeyword) {
    try {
      // Check if this is a Paribahis-related generation
      const keyword = primaryKeyword.toLowerCase();
      if (keyword.includes('paribahis')) {
        this.logOperation('Copying Paribahis brand assets', {
          outputDir,
          primaryKeyword
        });
        
        // Source paths for Paribahis assets
        const paribahisFavicon = path.join('./assets/paribahis/paribahis-favicon-32.png');
        const paribahisLogo = path.join('./assets/paribahis/paribahis-logo.svg');
        
        // Destination paths
        const faviconDest = path.join(outputDir, 'paribahis-favicon-32.png');
        const logoDest = path.join(outputDir, 'paribahis-logo.svg');
        
        // Copy favicon
        try {
          await fs.copyFile(paribahisFavicon, faviconDest);
          this.logOperation('Paribahis favicon copied', {
            source: paribahisFavicon,
            destination: faviconDest
          });
        } catch (error) {
          this.logError(error, { operation: 'Failed to copy Paribahis favicon' });
        }
        
        // Copy logo
        try {
          await fs.copyFile(paribahisLogo, logoDest);
          this.logOperation('Paribahis logo copied', {
            source: paribahisLogo,
            destination: logoDest
          });
        } catch (error) {
          this.logError(error, { operation: 'Failed to copy Paribahis logo' });
        }
      }
    } catch (error) {
      this.logError(error, { 
        operation: 'copyBrandAssets',
        outputDir,
        primaryKeyword
      });
      // Don't throw error - this shouldn't break the main workflow
    }
  }

  /**
   * Save raw HTML content to file for debugging and inspection
   * @param {string} htmlContent - The generated HTML content
   * @param {object} params - Generation parameters for folder naming
   * @param {string} fileType - Type of file to save ('raw-response', 'processed', etc.)
   */
  async saveRawHTML(htmlContent, params, fileType = 'processed') {
    try {
      // Create output directory path with primaryKeyword and date
      const primaryKeyword = params.primaryKeyword || 'content';
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const sanitizedKeyword = primaryKeyword.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const outputDir = path.join('./output', `${sanitizedKeyword}-${date}`);
      
      // Ensure directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Copy brand-specific assets if applicable (only for processed content)
      if (fileType === 'processed') {
        await this.copyBrandAssets(outputDir, primaryKeyword);
      }
      
      // Create file path based on type
      let fileName;
      switch (fileType) {
        case 'raw-response':
          fileName = 'raw-response.html';
          break;
        case 'processed':
          fileName = 'raw.html';
          break;
        default:
          fileName = `${fileType}.html`;
      }
      
      const filePath = path.join(outputDir, fileName);
      
      // Save content regardless of validity
      await fs.writeFile(filePath, htmlContent, 'utf8');
      
      this.logOperation(`${fileType} content saved for inspection`, {
        filePath,
        contentLength: htmlContent.length,
        outputDir,
        fileType
      });
      
    } catch (error) {
      this.logError(error, {
        operation: 'saveRawHTML',
        primaryKeyword: params.primaryKeyword,
        contentLength: htmlContent?.length || 0,
        fileType
      });
      // Don't throw error - this is just for debugging, shouldn't break the workflow
    }
  }
}

module.exports = ContentService;
