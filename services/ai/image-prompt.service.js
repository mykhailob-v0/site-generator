const AIServiceInterface = require('../base/ai-service.interface');
const OpenAI = require('openai');
const PromptService = require('../utilities/prompt.service');
const { OpenAIError } = require('../../src/utils/errors');
const { getConfig } = require('../../config/openai.config');

/**
 * Image Prompt Service
 * Refactored image prompt generation service
 * Creates detailed image generation prompts using GPT-4.1-2025-04-14
 */
class ImagePromptService extends AIServiceInterface {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    
    // Get model from OpenAI config
    const openaiConfig = getConfig();
    this.model = config.model || openaiConfig.openai.models.gpt41;
    this.client = new OpenAI({ apiKey });
    
    this.config = {
      maxRetries: 3,
      timeout: 60000,
      maxTokens: 16000, // Adjusted for GPT-4.1 limits
      temperature: 0.7, // GPT-4.1 supports temperature control
      promptsDirectory: config.promptsDirectory || './prompts',
      ...config
    };

    // Initialize prompt service
    this.promptService = new PromptService({
      promptsDirectory: this.config.promptsDirectory,
      cacheEnabled: config.cachePrompts !== false
    });

    this.usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0,
      successfulRequests: 0,
      averagePromptLength: 0
    };
  }

  /**
   * Generate image prompts from HTML content and image references
   * @param {string} htmlContent - HTML content to analyze
   * @param {Array} imageReferences - Array of image references from HTML
   * @param {object} params - Generation parameters
   * @returns {Promise<Array>} - Array of generated image prompts
   */
  async generatePrompts(htmlContent, imageReferences, params) {
    this.logOperation('generatePrompts', { 
      contentLength: htmlContent.length,
      imageCount: imageReferences.length,
      primaryKeyword: params.primaryKeyword,
      model: this.model 
    });

    const startTime = Date.now();

    try {
      if (imageReferences.length === 0) {
        this.logOperation('No image references found, skipping prompt generation');
        return [];
      }

      const prompts = [];
      
      // Process images in batches for better performance
      const batchSize = 3;
      for (let i = 0; i < imageReferences.length; i += batchSize) {
        const batch = imageReferences.slice(i, i + batchSize);
        const batchPrompts = await this.generateBatchPrompts(htmlContent, batch, params);
        prompts.push(...batchPrompts);
      }

      const duration = Date.now() - startTime;

      this.updateUsageStats({
        requests: Math.ceil(imageReferences.length / batchSize),
        successful: Math.ceil(imageReferences.length / batchSize),
        promptsGenerated: prompts.length
      });

      this.logOperation('Image prompts generation completed', { 
        duration,
        promptsGenerated: prompts.length,
        averagePromptLength: Math.round(prompts.reduce((sum, p) => sum + p.prompt.length, 0) / prompts.length)
      });

      return prompts;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateUsageStats({ errors: 1 });
      this.logError('generatePrompts', error, { imageCount: imageReferences.length, duration });
      
      throw new OpenAIError(
        `Image prompt generation failed: ${error.message}`, 
        this.model, 
        error.code
      );
    }
  }

  /**
   * Generate prompts for a batch of images
   * @param {string} htmlContent - HTML content for context
   * @param {Array} imageBatch - Batch of image references
   * @param {object} params - Generation parameters
   * @returns {Promise<Array>} - Generated prompts for the batch
   */
  async generateBatchPrompts(htmlContent, imageBatch, params) {
    const prompt = this.buildPromptGenerationPrompt(htmlContent, imageBatch, params);
    
    const response = await this.executeWithRetry(
      async () => await this.makeApiCall(prompt),
      'makeApiCall',
      this.config.maxRetries
    );

    const batchPrompts = this.parsePromptsResponse(response, imageBatch);
    
    // Update usage stats for this batch
    this.updateUsageStats({
      tokens: response.usage?.total_tokens || 0
    });

    return batchPrompts;
  }

  /**
   * Build prompt for image prompt generation
   * @param {string} htmlContent - HTML content for context
   * @param {Array} imageBatch - Batch of image references
   * @param {object} params - Generation parameters
   * @returns {string} - Generated prompt
   */
  buildPromptGenerationPrompt(htmlContent, imageBatch, params) {
    const { primaryKeyword, secondaryKeywords = [], brandName } = params;
    
    const imagesList = imageBatch.map((img, index) => 
      `${index + 1}. File: ${img.src}, Alt text: "${img.altText}"`
    ).join('\n');

    return `You are an expert AI image prompt engineer specializing in gambling and betting website imagery.

Analyze this HTML content and generate detailed image prompts for the specified images.

Website Context:
- Brand: ${brandName}
- Primary keyword: ${primaryKeyword}
- Secondary keywords: ${secondaryKeywords.join(', ') || 'None'}
- Industry: Turkish gambling/betting market
- Target: High-quality, professional, trustworthy imagery

HTML Content Context:
${htmlContent.substring(0, 2000)}...

Images to Generate Prompts For:
${imagesList}

For each image, create a detailed prompt that includes:
1. Visual style and composition
2. Colors and mood
3. Subject matter and context
4. Technical specifications
5. Cultural considerations for Turkish market
6. Trust and professionalism elements

Requirements:
- Professional, high-quality appearance
- Culturally appropriate for Turkish audience
- Gambling industry compliance
- Modern, clean aesthetic
- Brand-consistent imagery
- Trust-building visual elements

Return a JSON object with an array called "prompts" containing objects with:
- "filename": original filename
- "prompt": detailed image generation prompt
- "style": visual style description
- "dimensions": suggested dimensions
- "altText": original alt text

IMPORTANT: Respond with valid JSON in this exact structure:
{
  "prompts": [
    {
      "filename": "example.webp",
      "prompt": "detailed prompt here",
      "style": "professional, modern",
      "dimensions": "1024x1024",
      "altText": "alt text here"
    }
  ]
}`;
  }

  /**
   * Make API call for prompt generation
   * @param {string} prompt - Generation prompt
   * @returns {Promise<object>} - API response
   */
  async makeApiCall(prompt) {
    try {
      this.logOperation('Making image prompt API call', { 
        model: this.model, 
        promptLength: prompt.length 
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI image prompt engineer. Create detailed, professional prompts for gambling website imagery that are culturally appropriate and compliance-focused. Always respond with valid JSON format.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: "json_object" } // GPT-4.1 supports structured output
      });

      this.logOperation('Image prompt API call successful', { 
        tokensUsed: response.usage?.total_tokens,
        responseLength: response.choices[0]?.message?.content?.length || 0
      });

      return response;

    } catch (error) {
      this.logError('Image prompt API call failed', error, { model: this.model });
      throw new OpenAIError(`Image prompt API call failed: ${error.message}`, this.model, error.code);
    }
  }

  /**
   * Parse prompts response from API
   * @param {object} response - API response
   * @param {Array} imageBatch - Original image batch
   * @returns {Array} - Parsed image prompts
   */
  parsePromptsResponse(response, imageBatch) {
    try {
      // Debug the response structure
      console.log('🔍 DEBUG: Response structure:', {
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length,
        firstChoice: response.choices?.[0] ? Object.keys(response.choices[0]) : null,
        message: response.choices?.[0]?.message ? Object.keys(response.choices[0].message) : null,
        contentType: typeof response.choices?.[0]?.message?.content,
        contentLength: response.choices?.[0]?.message?.content?.length,
        content: response.choices?.[0]?.message?.content?.substring(0, 200),
        refusal: response.choices?.[0]?.message?.refusal,
        finishReason: response.choices?.[0]?.finish_reason
      });
      
      const message = response.choices[0]?.message;
      if (message?.refusal) {
        console.log('❌ Model refused to generate response:', message.refusal);
        throw new Error(`Model refusal: ${message.refusal}`);
      }
      
      const content = message?.content;
      if (!content || content.trim() === '') {
        throw new Error(`No content in API response. Finish reason: ${response.choices[0]?.finish_reason}`);
      }

      // Clean the content - GPT-4.1 with json_object mode should return clean JSON
      let cleanedContent = content.trim();
      
      const parsedResponse = JSON.parse(cleanedContent);
      let prompts;

      // Handle the expected structure from GPT-4.1
      if (parsedResponse.prompts && Array.isArray(parsedResponse.prompts)) {
        prompts = parsedResponse.prompts;
      } else if (Array.isArray(parsedResponse)) {
        // Fallback for direct array response
        prompts = parsedResponse;
      } else if (parsedResponse.images && Array.isArray(parsedResponse.images)) {
        // Alternative structure
        prompts = parsedResponse.images;
      } else {
        throw new Error('Invalid response format: expected "prompts" array in JSON object');
      }

      // Validate and enhance prompts
      const validatedPrompts = prompts.map((promptData, index) => {
        const originalImage = imageBatch[index] || imageBatch[0]; // Fallback to first image
        
        return {
          filename: promptData.filename || originalImage.src,
          prompt: promptData.prompt || this.generateFallbackPrompt(originalImage),
          style: promptData.style || 'professional, modern',
          dimensions: promptData.dimensions || '1024x768',
          altText: promptData.altText || originalImage.altText,
          originalSrc: originalImage.src,
          metadata: {
            generated: true,
            timestamp: new Date().toISOString(),
            model: this.model
          }
        };
      });

      this.logOperation('Prompts parsed successfully', {
        promptsGenerated: validatedPrompts.length,
        averagePromptLength: Math.round(validatedPrompts.reduce((sum, p) => sum + p.prompt.length, 0) / validatedPrompts.length)
      });

      return validatedPrompts;

    } catch (error) {
      this.logError('Prompts parsing failed', error);
      
      // Generate fallback prompts for the batch
      return this.generateFallbackPrompts(imageBatch);
    }
  }

  /**
   * Generate fallback prompts when API parsing fails
   * @param {Array} imageBatch - Image batch
   * @returns {Array} - Fallback prompts
   */
  generateFallbackPrompts(imageBatch) {
    this.logOperation('Generating fallback prompts', { imageCount: imageBatch.length });

    return imageBatch.map(image => ({
      filename: image.src,
      prompt: this.generateFallbackPrompt(image),
      style: 'professional, modern',
      dimensions: '1024x768',
      altText: image.altText,
      originalSrc: image.src,
      metadata: {
        generated: false,
        fallback: true,
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * Generate a fallback prompt for a single image
   * @param {object} image - Image reference
   * @returns {string} - Fallback prompt
   */
  generateFallbackPrompt(image) {
    const basePrompt = 'Professional, high-quality gambling website image';
    const context = image.altText ? ` showing ${image.altText}` : '';
    const style = ', modern design, clean composition, trustworthy appearance, Turkish market appropriate';
    
    return basePrompt + context + style;
  }

  /**
   * Optimize prompts for better image generation
   * @param {Array} prompts - Array of prompts to optimize
   * @returns {Array} - Optimized prompts
   */
  optimizePrompts(prompts) {
    this.logOperation('Optimizing image prompts');

    return prompts.map(promptData => {
      // Add quality enhancers
      let optimizedPrompt = promptData.prompt;
      
      if (!optimizedPrompt.includes('high quality')) {
        optimizedPrompt += ', high quality';
      }
      
      if (!optimizedPrompt.includes('professional')) {
        optimizedPrompt += ', professional';
      }

      // Add technical specifications
      if (!optimizedPrompt.includes('4K') && !optimizedPrompt.includes('HD')) {
        optimizedPrompt += ', 4K resolution';
      }

      return {
        ...promptData,
        prompt: optimizedPrompt,
        optimized: true
      };
    });
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
    if (stats.promptsGenerated) this.usageStats.totalPromptsGenerated += stats.promptsGenerated;
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
        : 0,
      averagePromptsPerRequest: this.usageStats.totalRequests > 0
        ? Math.round(this.usageStats.totalPromptsGenerated / this.usageStats.totalRequests)
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
      temperature: this.config.temperature,
      provider: 'OpenAI',
      specialization: 'Image prompt generation'
    };
  }

  /**
   * Get cost estimation for GPT-4.1
   * @returns {object} - Cost estimation
   */
  getCostEstimation() {
    // GPT-4.1 pricing (approximate - check OpenAI pricing for exact rates)
    const costPer1KTokens = 0.03; // Higher than GPT-3.5, lower than GPT-4-turbo
    const estimatedCost = (this.usageStats.totalTokens / 1000) * costPer1KTokens;
    
    return {
      totalTokens: this.usageStats.totalTokens,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      currency: 'USD',
      model: this.model
    };
  }
}

module.exports = ImagePromptService;
