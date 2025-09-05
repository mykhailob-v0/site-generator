const BaseService = require('../base/base.service');
const ValidationService = require('./validation.service');
const MetricsService = require('./metrics.service');
const CacheService = require('../utilities/cache.service');

// Import refactored services 
const StructureService = require('../ai/structure.service');
const ContentService = require('../ai/content.service');
const ImagePromptService = require('../ai/image-prompt.service');
const ImageGenerationService = require('../ai/image-generation.service');
const HtmlCombinerService = require('../processing/html-combiner.service');

/**
 * Orchestrator Service
 * Main service that coordinates the entire HTML generation workflow
 * Replaces both generator.service.js and generator-enhanced.service.js
 * Provides production-ready orchestration with logging, metrics, and error handling
 */
class OrchestratorService extends BaseService {
  constructor(apiKey, config = {}) {
    super(config);
    
    this.apiKey = apiKey;
    this.config = {
      useCache: true,
      retryAttempts: 3,
      timeoutMs: 300000, // 5 minutes
      ...config
    };

    // Initialize core services
    this.validation = new ValidationService(config.validation);
    this.metrics = new MetricsService(config.metrics);
    this.cache = config.useCache ? new CacheService(config.cache) : null;

    // Initialize AI services
    this.services = this.initializeServices(apiKey, config);
  }

  /**
   * Initialize all AI and processing services
   * @param {string} apiKey - OpenAI API key
   * @param {object} config - Configuration object
   * @returns {object} - Initialized services
   */
  initializeServices(apiKey, config) {
    return {
      structure: new StructureService(apiKey, config.ai?.structure),
      content: new ContentService(apiKey, config.ai?.content),
      imagePrompt: new ImagePromptService(apiKey, config.ai?.imagePrompt),
      imageGeneration: new ImageGenerationService(apiKey, config.ai?.imageGeneration),
      htmlCombiner: new HtmlCombinerService(config.processing?.htmlCombiner)
    };
  }

  /**
   * Generate complete website with all components
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Generation result
   */
  async generateSite(params) {
    const requestId = this.generateRequestId();
    this.currentRequestId = requestId;
    
    // Set request ID for all services
    if (this.validation.setRequestId) this.validation.setRequestId(requestId);
    if (this.metrics.setRequestId) this.metrics.setRequestId(requestId);
    Object.values(this.services).forEach(service => {
      if (service.setRequestId) {
        service.setRequestId(requestId);
      }
    });

    const startTime = Date.now();
    this.log(`Starting site generation for ${params.primaryKeyword}`, 'info', {
      requestId,
      primaryKeyword: params.primaryKeyword,
      brandName: params.brandName,
      hasSecondaryKeywords: !!params.secondaryKeywords?.length
    });

    try {
      // Step 1: Validate inputs
      this.validation.setRequestId(requestId);
      const validatedParams = await this.executeStep(
        'validation',
        async () => await this.validation.validateGenerationParams({
          ...params,
          apiKey: this.apiKey  // Include API key for validation
        })
      );

      // Step 2: Generate structure (with caching)
      const structure = await this.executeStep(
        'structure_generation',
        async () => await this.generateStructureWithCache(validatedParams)
      );

      // Step 3: Generate HTML content
      const contentResult = await this.executeStep(
        'html_generation',
        async () => await this.services.content.generate({
          ...validatedParams,
          structure
        })
      );
      
      // Extract HTML content from the chained result
      const htmlContent = contentResult.content || contentResult.data?.htmlContent || contentResult.data || contentResult;

      // Debug logging
      console.log('\n🔍 DEBUG: Content Result Analysis');
      console.log('contentResult type:', typeof contentResult);
      console.log('contentResult keys:', contentResult ? Object.keys(contentResult) : 'null');
      console.log('contentResult.content type:', typeof contentResult?.content);
      console.log('contentResult.content length:', contentResult?.content?.length);
      
      // Ensure htmlContent is a string
      let finalHtmlContent;
      if (typeof htmlContent === 'string') {
        finalHtmlContent = htmlContent;
      } else if (htmlContent && typeof htmlContent === 'object') {
        finalHtmlContent = htmlContent.content || htmlContent.html || htmlContent.htmlContent || JSON.stringify(htmlContent);
      } else {
        throw new Error('Could not extract HTML content from ContentService result');
      }

      // Step 4: Parse and generate image prompts
      const { imagePrompts, parsedContent } = await this.executeStep(
        'image_prompt_generation',
        async () => await this.generateImagePrompts(finalHtmlContent, validatedParams)
      );

      // Step 5: Generate images
      const images = await this.executeStep(
        'image_generation',
        async () => await this.generateImages(imagePrompts, validatedParams)
      );

      // Step 6: Combine HTML with images
      const finalHTML = await this.executeStep(
        'html_combination',
        async () => await this.services.htmlCombiner.createSelfContainedHTML(
          finalHtmlContent,
          images,
          validatedParams.outputDir
        )
      );

      // Step 7: Generate additional files (CSS, JS, etc.)
      await this.executeStep(
        'additional_files',
        async () => await this.generateAdditionalFiles(validatedParams.outputDir, validatedParams)
      );

      const duration = Date.now() - startTime;
      const result = {
        success: true,
        requestId,
        duration,
        outputDir: validatedParams.outputDir,
        htmlFile: finalHTML.filepath,
        imagesGenerated: images.length,
        fileSize: finalHTML.size,
        formattedSize: finalHTML.formattedSize,
        metrics: this.metrics.getMetrics(),
        timestamp: new Date().toISOString()
      };

      // Record metrics
      this.metrics.recordRequest({
        requestId,
        operation: 'generateSite',
        duration,
        success: true
      });

      this.log(`Site generation completed successfully`, 'info', {
        requestId,
        duration,
        outputDir: result.outputDir,
        success: result.success
      });
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record error metrics
      this.metrics.recordError({
        requestId,
        service: 'OrchestratorService',
        operation: 'generateSite',
        errorType: error.constructor.name,
        errorMessage: error.message,
        stack: error.stack
      });

      this.logError(error, {
        requestId,
        operation: 'generateSite',
        duration,
        params: {
          primaryKeyword: params.primaryKeyword,
          brandName: params.brandName
        }
      });

      return {
        success: false,
        requestId,
        duration,
        error: error.message,
        errorType: error.constructor.name,
        metrics: this.metrics.getMetrics(),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute a workflow step with timing and error handling
   * @param {string} stepName - Name of the step
   * @param {Function} stepFunction - Function to execute
   * @returns {Promise<any>} - Step result
   */
  async executeStep(stepName, stepFunction) {
    const stepStartTime = Date.now();
    this.logOperation(`Starting step: ${stepName}`);

    try {
      const result = await this.executeWithRetry(stepFunction, stepName, this.config.retryAttempts);
      const stepDuration = Date.now() - stepStartTime;
      
      this.metrics.recordPerformance({
        requestId: this.requestId,
        operation: 'generateSite',
        phase: stepName,
        duration: stepDuration
      });

      this.logOperation(`Completed step: ${stepName}`, { duration: stepDuration });
      return result;

    } catch (error) {
      const stepDuration = Date.now() - stepStartTime;
      this.logError(`Step failed: ${stepName}`, error, { duration: stepDuration });
      throw error;
    }
  }

  /**
   * Generate structure with caching support
   * @param {object} params - Validated parameters
   * @returns {Promise<object>} - Structure data
   */
  async generateStructureWithCache(params) {
    if (!this.cache) {
      return await this.services.structure.generate(params);
    }

    const cacheKey = this.cache.generateKey('structure', {
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords,
      brandName: params.brandName
    });

    return await this.cache.getOrSet(
      cacheKey,
      async () => {
        this.logOperation('Structure cache miss, generating new structure');
        return await this.services.structure.generate(params);
      },
      1800 // 30 minutes cache
    );
  }

  /**
   * Generate image prompts from HTML content
   * @param {string} htmlContent - Generated HTML content
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Image prompts and parsed content
   */
  async generateImagePrompts(htmlContent, params) {
    this.logOperation('Parsing HTML for image references');

    // Debug logging
    console.log('\n🔍 DEBUG: HTML Content Analysis');
    console.log('HTML content type:', typeof htmlContent);
    console.log('HTML content length:', htmlContent ? htmlContent.length : 'null/undefined');
    console.log('HTML content preview (first 200 chars):', htmlContent ? htmlContent.substring(0, 200) + '...' : 'none');
    
    // Parse HTML to find image placeholders
    const imageReferences = this.parseImageReferences(htmlContent);
    
    if (imageReferences.length === 0) {
      this.logOperation('No image references found in HTML');
      return { imagePrompts: [], parsedContent: htmlContent };
    }

    this.logOperation(`Found ${imageReferences.length} image references`);

    // Generate prompts for each image
    const imagePrompts = await this.services.imagePrompt.generatePrompts(
      htmlContent,
      imageReferences,
      params
    );

    return { imagePrompts, parsedContent: htmlContent };
  }

  /**
   * Generate images from prompts using parallel processing
   * @param {Array} imagePrompts - Array of image prompts
   * @param {object} params - Generation parameters
   * @returns {Promise<Array>} - Generated images
   */
  async generateImages(imagePrompts, params) {
    if (imagePrompts.length === 0) {
      return [];
    }

    this.logOperation(`Generating ${imagePrompts.length} images`);

    try {
      // Use the ImageGenerationService's parallel processing capability
      const images = await this.services.imageGeneration.generateImages(imagePrompts, params.outputDir);

      this.logOperation(`Parallel image generation completed`, { 
        requested: imagePrompts.length, 
        generated: images.length,
        successRate: Math.round((images.length / imagePrompts.length) * 100)
      });

      return images;

    } catch (error) {
      this.logError('Parallel image generation failed', error, { 
        promptCount: imagePrompts.length 
      });
      
      // Fallback to sequential processing if parallel fails
      this.logOperation('Falling back to sequential image generation');
      
      const images = [];
      
      for (const prompt of imagePrompts) {
        try {
          // Check cache first if enabled
          let imageData;
          
          if (this.cache) {
            const cacheKey = this.cache.generateKey('image', prompt.prompt);
            imageData = await this.cache.get(cacheKey);
            
            if (!imageData) {
              imageData = await this.services.imageGeneration.generateSingleImage(prompt, params.outputDir);
              await this.cache.set(cacheKey, imageData, 3600); // 1 hour cache
            } else {
              this.logOperation('Image cache hit', { prompt: prompt.altText });
            }
          } else {
            imageData = await this.services.imageGeneration.generateSingleImage(prompt, params.outputDir);
          }

          images.push(imageData);
          
          this.logOperation('Image generated successfully', { 
            altText: prompt.altText,
            filename: imageData.filename 
          });

        } catch (error) {
          this.logError('Image generation failed', error, { prompt: prompt.altText });
          // Continue with other images even if one fails
        }
      }

      this.logOperation(`Sequential fallback completed`, { 
        requested: imagePrompts.length, 
        generated: images.length 
      });

      return images;
    }

    return images;
  }

  /**
   * Parse HTML content to find image references
   * @param {string} htmlContent - HTML content to parse
   * @returns {Array} - Array of image references
   */
  parseImageReferences(htmlContent) {
    const imageReferences = [];
    
    // More flexible regex that handles different attribute orders
    const imgRegex = /<img[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const imgTag = match[0];
      
      // Extract src attribute
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
      
      // Extract alt attribute 
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
      
      if (srcMatch && altMatch) {
        // Skip data URLs and external URLs
        const src = srcMatch[1];
        if (!src.startsWith('data:') && !src.startsWith('http')) {
          imageReferences.push({
            src: src,
            altText: altMatch[1],
            originalTag: imgTag
          });
        }
      }
    }

    return imageReferences;
  }

  /**
   * Generate additional files (CSS, robots.txt, etc.)
   * @param {string} outputDir - Output directory
   * @param {object} params - Generation parameters
   * @returns {Promise<void>}
   */
  async generateAdditionalFiles(outputDir, params) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Generate robots.txt
      const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${params.siteUrl || 'https://example.com'}/sitemap.xml`;

      await fs.writeFile(path.join(outputDir, 'robots.txt'), robotsTxt);

      // Generate simple sitemap.xml
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${params.siteUrl || 'https://example.com'}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

      await fs.writeFile(path.join(outputDir, 'sitemap.xml'), sitemap);

      this.logOperation('Additional files generated', { 
        files: ['robots.txt', 'sitemap.xml'] 
      });

    } catch (error) {
      this.logError('Additional files generation failed', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get system status and health check
   * @returns {Promise<object>} - System status
   */
  async getSystemStatus() {
    const requestId = this.generateRequestId();
    this.setRequestId(requestId);

    try {
      this.logOperation('Performing system health check');

      const serviceStatuses = await Promise.allSettled([
        this.checkServiceStatus('structure', this.services.structure),
        this.checkServiceStatus('content', this.services.content),
        this.checkServiceStatus('imagePrompt', this.services.imagePrompt),
        this.checkServiceStatus('imageGeneration', this.services.imageGeneration)
      ]);

      const validApiKey = await this.validation.validateApiKey(this.apiKey);

      const status = {
        ready: serviceStatuses.every(result => 
          result.status === 'fulfilled' && result.value.valid
        ),
        apiKey: !!validApiKey,
        services: serviceStatuses.map(result => 
          result.status === 'fulfilled' ? result.value : { 
            valid: false, 
            error: result.reason.message 
          }
        ),
        metrics: this.metrics.getMetrics(),
        cache: this.cache ? this.cache.getStats() : null,
        timestamp: new Date().toISOString()
      };

      this.logOperation('System health check completed', { ready: status.ready });
      return status;

    } catch (error) {
      this.logError('System health check failed', error);
      return {
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check individual service status
   * @param {string} name - Service name
   * @param {object} service - Service instance
   * @returns {Promise<object>} - Service status
   */
  async checkServiceStatus(name, service) {
    try {
      const isValid = service.validateApiKey ? await service.validateApiKey() : true;
      
      return {
        name,
        valid: isValid,
        model: service.model || 'unknown',
        className: service.constructor.name
      };
    } catch (error) {
      return {
        name,
        valid: false,
        error: error.message,
        className: service.constructor.name
      };
    }
  }

  /**
   * Get usage statistics across all services
   * @returns {object} - Comprehensive usage statistics
   */
  getUsageStatistics() {
    const stats = {
      orchestrator: {
        requestId: this.requestId,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      services: {},
      metrics: this.metrics.getMetrics(),
      cache: this.cache ? this.cache.getStats() : null
    };

    // Get stats from each service
    Object.entries(this.services).forEach(([name, service]) => {
      if (service.getUsageStats) {
        stats.services[name] = service.getUsageStats();
      }
    });

    return stats;
  }

  /**
   * Clear all caches
   * @returns {Promise<void>}
   */
  async clearCaches() {
    if (this.cache) {
      await this.cache.flush();
      this.logOperation('All caches cleared');
    }
  }

  /**
   * Cleanup and destroy service
   */
  destroy() {
    if (this.cache) {
      this.cache.close();
    }
    
    if (this.metrics) {
      this.metrics.destroy();
    }

    this.logOperation('Orchestrator service destroyed');
  }
}

module.exports = OrchestratorService;
