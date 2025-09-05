const AIServiceInterface = require('../base/ai-service.interface');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { OpenAIError, FileSystemError } = require('../../src/utils/errors');

/**
 * Semaphore class for controlling concurrent operations
 */
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.current < this.max) {
        this.current++;
        resolve(() => this.release());
      } else {
        this.queue.push(() => {
          this.current++;
          resolve(() => this.release());
        });
      }
    });
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }
}

/**
 * Image Generation Service  
 * Refactored image generation service
 * Generates images using GPT-image-1 with production-ready architecture
 */
class ImageGenerationService extends AIServiceInterface {
  constructor(apiKey, config = {}) {
    super(config);
    
    this.apiKey = apiKey;
    this.model = config.model || 'dall-e-3';
    this.client = new OpenAI({ apiKey });
    
    this.config = {
      maxRetries: 3,
      timeout: 300000, // 5 minutes for image generation
      defaultSize: '1024x1024',
      quality: 'hd',
      maxConcurrent: 5, // Parallel processing with 5 threads
      ...config
    };

    this.usageStats = {
      totalRequests: 0,
      totalImages: 0,
      errors: 0,
      successfulRequests: 0,
      totalFileSize: 0,
      averageGenerationTime: 0
    };

    this.activeGenerations = 0;
  }

  /**
   * Generate images from prompts using parallel processing with 5 threads
   * @param {Array} imagePrompts - Array of image prompt objects
   * @param {string} outputDir - Output directory for images
   * @returns {Promise<Array>} - Array of generated image data
   */
  async generateImages(imagePrompts, outputDir) {
    this.logOperation('generateImages', { 
      promptCount: imagePrompts.length,
      outputDir,
      model: this.model,
      maxConcurrent: this.config.maxConcurrent
    });

    const startTime = Date.now();

    try {
      if (imagePrompts.length === 0) {
        this.logOperation('No image prompts provided, skipping generation');
        return [];
      }

      // Ensure output directory exists
      await this.ensureOutputDirectory(outputDir);

      // Create a semaphore to limit concurrent operations
      const semaphore = new Semaphore(this.config.maxConcurrent);
      
      // Process all images in parallel with concurrency control
      const imagePromises = imagePrompts.map(async (prompt, index) => {
        const release = await semaphore.acquire();
        try {
          this.logOperation('Starting parallel image generation', {
            index: index + 1,
            total: imagePrompts.length,
            filename: prompt.filename,
            activeThreads: this.activeGenerations
          });
          
          const result = await this.generateSingleImage(prompt, outputDir);
          
          this.logOperation('Completed parallel image generation', {
            index: index + 1,
            total: imagePrompts.length,
            filename: result.filename,
            fileSize: result.fileSize
          });
          
          return result;
        } catch (error) {
          this.logError('Parallel image generation failed', error, {
            index: index + 1,
            filename: prompt.filename
          });
          return null; // Return null for failed generations
        } finally {
          release();
        }
      });

      // Wait for all images to complete
      const results = await Promise.allSettled(imagePromises);
      
      // Filter successful results
      const images = results
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

      const duration = Date.now() - startTime;

      this.updateUsageStats({
        requests: 1,
        images: images.length,
        successful: images.length > 0 ? 1 : 0,
        generationTime: duration
      });

      this.logOperation('Parallel image generation completed', { 
        duration,
        requested: imagePrompts.length,
        generated: images.length,
        successRate: Math.round((images.length / imagePrompts.length) * 100),
        averageTimePerImage: Math.round(duration / imagePrompts.length),
        parallelEfficiency: Math.round((duration / (imagePrompts.length * 1000)) * 100) // Rough efficiency metric
      });

      return images;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateUsageStats({ errors: 1 });
      this.logError('generateImages', error, { promptCount: imagePrompts.length, duration });
      
      throw new OpenAIError(
        `Parallel image generation failed: ${error.message}`, 
        this.model, 
        error.code
      );
    }
  }

  /**
   * Generate a single image from prompt
   * @param {object} promptData - Image prompt data
   * @param {string} outputDir - Output directory
   * @returns {Promise<object>} - Generated image data
   */
  async generateSingleImage(promptData, outputDir) {
    this.activeGenerations++;
    const imageStartTime = Date.now();
    
    try {
      this.logOperation('Generating single image', { 
        filename: promptData.filename,
        promptLength: promptData.prompt.length
      });

      const response = await this.executeWithRetry(
        async () => await this.makeImageApiCall(promptData),
        'makeImageApiCall',
        this.config.maxRetries
      );

      const imageData = await this.processImageResponse(response, promptData, outputDir);
      const duration = Date.now() - imageStartTime;

      this.logOperation('Single image generation completed', { 
        filename: imageData.filename,
        fileSize: imageData.fileSize,
        duration
      });

      return imageData;

    } catch (error) {
      const duration = Date.now() - imageStartTime;
      this.logError('Single image generation failed', error, {
        filename: promptData.filename,
        duration
      });
      throw error;
    } finally {
      this.activeGenerations--;
    }
  }

  /**
   * Make API call for image generation
   * @param {object} promptData - Image prompt data
   * @returns {Promise<object>} - API response
   */
  async makeImageApiCall(promptData) {
    try {
      this.logOperation('Making image API call', { 
        model: this.model,
        filename: promptData.filename,
        dimensions: promptData.dimensions || this.config.defaultSize
      });

      const response = await this.client.images.generate({
        model: this.model,
        prompt: promptData.prompt,
        size: this.validateImageSize(promptData.dimensions || this.config.defaultSize),
        quality: this.config.quality,
        n: 1
      });

      this.logOperation('Image API call successful', { 
        imageUrl: response.data[0]?.url ? 'received' : 'missing',
        revisedPrompt: response.data[0]?.revised_prompt ? 'received' : 'none'
      });

      return response;

    } catch (error) {
      this.logError('Image API call failed', error, { 
        model: this.model,
        filename: promptData.filename
      });
      throw new OpenAIError(`Image API call failed: ${error.message}`, this.model, error.code);
    }
  }

  /**
   * Process image response and save to file
   * @param {object} response - API response
   * @param {object} promptData - Original prompt data
   * @param {string} outputDir - Output directory
   * @returns {Promise<object>} - Processed image data
   */
  async processImageResponse(response, promptData, outputDir) {
    try {
      const imageData = response.data[0];
      if (!imageData || !imageData.url) {
        throw new Error('No image data in API response');
      }

      // Generate filename
      const filename = this.generateImageFilename(promptData.filename);
      const filepath = path.join(outputDir, filename);

      // Download and save image
      const imageBuffer = await this.downloadImage(imageData.url);
      await this.saveImageFile(imageBuffer, filepath);

      // Get file stats
      const stats = await fs.stat(filepath);

      this.updateUsageStats({
        fileSize: stats.size
      });

      const result = {
        filename,
        filepath,
        originalSrc: promptData.originalSrc,
        altText: promptData.altText,
        prompt: promptData.prompt,
        revisedPrompt: imageData.revised_prompt,
        fileSize: stats.size,
        formattedSize: this.formatBytes(stats.size),
        dimensions: promptData.dimensions || this.config.defaultSize,
        metadata: {
          model: this.model,
          quality: this.config.quality,
          style: this.config.style,
          timestamp: new Date().toISOString(),
          ...promptData.metadata
        }
      };

      this.logOperation('Image processed and saved', {
        filename,
        fileSize: stats.size,
        hasRevisedPrompt: !!imageData.revised_prompt
      });

      return result;

    } catch (error) {
      this.logError('Image processing failed', error, { filename: promptData.filename });
      throw new FileSystemError(`Image processing failed: ${error.message}`, 'process', promptData.filename);
    }
  }

  /**
   * Download image from URL
   * @param {string} imageUrl - Image URL
   * @returns {Promise<Buffer>} - Image buffer
   */
  async downloadImage(imageUrl) {
    try {
      this.logOperation('Downloading image', { url: imageUrl.substring(0, 50) + '...' });

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      
      this.logOperation('Image downloaded successfully', { 
        size: buffer.length,
        contentType: response.headers.get('content-type')
      });

      return buffer;

    } catch (error) {
      this.logError('Image download failed', error, { url: imageUrl });
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Save image buffer to file
   * @param {Buffer} imageBuffer - Image data
   * @param {string} filepath - File path
   * @returns {Promise<void>}
   */
  async saveImageFile(imageBuffer, filepath) {
    try {
      await fs.writeFile(filepath, imageBuffer);
      this.logOperation('Image file saved', { 
        filepath,
        size: imageBuffer.length
      });
    } catch (error) {
      throw new FileSystemError(`Failed to save image file: ${error.message}`, 'write', filepath);
    }
  }

  /**
   * Generate appropriate filename for image
   * @param {string} originalFilename - Original filename from prompt
   * @returns {string} - Generated filename
   */
  generateImageFilename(originalFilename) {
    // Extract base name and ensure proper extension
    const baseName = path.parse(originalFilename).name;
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${baseName}-${timestamp}-${randomSuffix}.webp`;
  }

  /**
   * Validate and normalize image size for DALL-E 3
   * @param {string} size - Size string (e.g., "1024x768")
   * @returns {string} - Validated size compatible with DALL-E 3
   */
  validateImageSize(size) {
    // DALL-E 3 supported sizes
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    
    if (validSizes.includes(size)) {
      return size;
    }

    // Map common unsupported sizes to nearest supported size
    const sizeMapping = {
      '256x256': '1024x1024',
      '512x512': '1024x1024',
      '768x768': '1024x1024',
      '1024x768': '1024x1024',
      '768x1024': '1024x1024',
      '1536x1024': '1792x1024',
      '1024x1536': '1024x1792'
    };

    const mappedSize = sizeMapping[size];
    if (mappedSize) {
      this.logOperation('Mapping unsupported size to DALL-E 3 compatible size', { 
        requested: size, 
        mapped: mappedSize 
      });
      return mappedSize;
    }

    // Default to square if no mapping found
    this.logOperation('Unknown image size, using default', { 
      requested: size, 
      using: this.config.defaultSize 
    });
    
    return this.config.defaultSize;
  }

  /**
   * Ensure output directory exists
   * @param {string} outputDir - Output directory path
   * @returns {Promise<void>}
   */
  async ensureOutputDirectory(outputDir) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      this.logOperation('Output directory ensured', { outputDir });
    } catch (error) {
      throw new FileSystemError(`Failed to create output directory: ${error.message}`, 'create', outputDir);
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    if (stats.images) this.usageStats.totalImages += stats.images;
    if (stats.errors) this.usageStats.errors += stats.errors;
    if (stats.successful) this.usageStats.successfulRequests += stats.successful;
    if (stats.fileSize) this.usageStats.totalFileSize += stats.fileSize;
    
    if (stats.generationTime) {
      const totalGenerations = this.usageStats.successfulRequests + this.usageStats.errors;
      this.usageStats.averageGenerationTime = totalGenerations > 1
        ? Math.round((this.usageStats.averageGenerationTime * (totalGenerations - 1) + stats.generationTime) / totalGenerations)
        : stats.generationTime;
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
        : 0,
      averageFileSize: this.usageStats.totalImages > 0
        ? Math.round(this.usageStats.totalFileSize / this.usageStats.totalImages)
        : 0,
      formattedTotalSize: this.formatBytes(this.usageStats.totalFileSize),
      activeGenerations: this.activeGenerations
    };
  }

  /**
   * Get model information
   * @returns {object} - Model details
   */
  getModelInfo() {
    return {
      name: this.model,
      type: 'image-generation',
      defaultSize: this.config.defaultSize,
      quality: this.config.quality,
      style: this.config.style,
      provider: 'OpenAI',
      maxConcurrent: this.config.maxConcurrent
    };
  }

  /**
   * Get cost estimation (DALL-E 3 pricing)
   * @returns {object} - Cost estimation
   */
  getCostEstimation() {
    // DALL-E 3 pricing (approximate)
    const costPerImage = this.config.quality === 'hd' ? 0.080 : 0.040;
    const estimatedCost = this.usageStats.totalImages * costPerImage;
    
    return {
      totalImages: this.usageStats.totalImages,
      costPerImage,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      currency: 'USD',
      model: this.model,
      quality: this.config.quality
    };
  }

  /**
   * Cancel all active generations (cleanup)
   */
  async cancelActiveGenerations() {
    this.logOperation('Cancelling active generations', { 
      activeCount: this.activeGenerations 
    });
    
    // In a real implementation, you might want to track and cancel actual HTTP requests
    this.activeGenerations = 0;
  }
}

module.exports = ImageGenerationService;
