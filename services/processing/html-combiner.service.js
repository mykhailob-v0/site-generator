const BaseService = require('../base/base.service');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

/**
 * HTML Combiner Service
 * Combines HTML content with embedded base64 images for self-contained files
 * Provides optimization and metadata generation capabilities
 */
class HTMLCombinerService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      supportedFormats: ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.svg'],
      optimizeOutput: true,
      includeMetadata: true,
      maxImageSize: 100 * 1024, // 100KB per image (much smaller limit)
      maxTotalSize: 3 * 1024 * 1024, // 3MB total (reasonable for web)
      targetImageSize: 50 * 1024, // 50KB target per image
      maxHtmlSize: 5 * 1024 * 1024, // 5MB max HTML file
      compressionQuality: 75, // 75% quality for JPEG compression
      webpQuality: 80, // 80% quality for WebP
      maxWidth: 800, // Max width for images
      maxHeight: 600, // Max height for images
      enableImageCompression: true,
      ...config
    };

    this.stats = {
      filesProcessed: 0,
      imagesEmbedded: 0,
      totalSizeReduction: 0,
      optimizationSavings: 0
    };
  }

  /**
   * Combine HTML and images into a single file with embedded base64 images
   * @param {string} htmlContent - The original HTML content
   * @param {Array<Object>} generatedImages - Array of generated image objects
   * @param {string} outputDir - Output directory path
   * @returns {Promise<string>} Combined HTML content with embedded images
   */
  async combineHTMLWithImages(htmlContent, generatedImages, outputDir) {
    return await this.executeWithRetry(async () => {
      this.logOperation('Starting HTML combination with images', {
        imageCount: generatedImages.length,
        outputDir
      });
      
      // Validate inputs
      this.validateRequired({ htmlContent, generatedImages, outputDir });
      
      if (!Array.isArray(generatedImages)) {
        throw new Error('Generated images must be an array');
      }

      let combinedHTML = htmlContent;
      const imageMap = this.createImageMap(generatedImages);
      const embeddingResults = [];
      let totalEmbeddedSize = 0;
      
      // Check total estimated size before processing
      const estimatedSize = await this.estimateTotalSize(generatedImages);
      if (estimatedSize > this.config.maxTotalSize) {
        this.logOperation('Warning: Estimated size exceeds maximum', {
          estimatedSize: this.formatBytes(estimatedSize),
          maxSize: this.formatBytes(this.config.maxTotalSize)
        });
      }
      
      // Replace image references with base64 data URLs
      for (const [originalSrc, imageInfo] of imageMap.entries()) {
        try {
          // Check individual image size
          const originalImageSize = await this.getFileSize(imageInfo.filepath);
          
          let processedImageBuffer;
          let finalImageSize;
          
          if (this.config.enableImageCompression && originalImageSize > this.config.targetImageSize) {
            // Compress the image before embedding
            processedImageBuffer = await this.compressImage(imageInfo.filepath);
            finalImageSize = processedImageBuffer.length;
            
            this.logOperation('Image compressed before embedding', {
              filename: imageInfo.filename,
              originalSize: this.formatBytes(originalImageSize),
              compressedSize: this.formatBytes(finalImageSize),
              savings: this.formatBytes(originalImageSize - finalImageSize)
            });
          } else {
            // Use original image if it's already small enough
            processedImageBuffer = await fs.readFile(imageInfo.filepath);
            finalImageSize = processedImageBuffer.length;
          }
          
          // Skip if still too large after compression
          if (finalImageSize > this.config.maxImageSize) {
            this.logOperation('Skipping large image even after compression', {
              filename: imageInfo.filename,
              size: this.formatBytes(finalImageSize),
              maxSize: this.formatBytes(this.config.maxImageSize)
            });
            continue;
          }

          const base64Data = processedImageBuffer.toString('base64');
          const mimeType = this.getMimeType(imageInfo.filename);
          const dataUrl = `data:${mimeType};base64,${base64Data}`;
          
          // Replace all occurrences of the original src
          const regex = new RegExp(this.escapeRegExp(originalSrc), 'g');
          const matches = (combinedHTML.match(regex) || []).length;
          combinedHTML = combinedHTML.replace(regex, dataUrl);
          
          totalEmbeddedSize += finalImageSize;
          embeddingResults.push({
            filename: imageInfo.filename,
            originalSrc,
            size: finalImageSize,
            originalSize: originalImageSize,
            compressed: finalImageSize < originalImageSize,
            replacements: matches,
            embedded: true
          });
          
          this.logOperation('Image embedded successfully', {
            filename: imageInfo.filename,
            size: this.formatBytes(finalImageSize),
            replacements: matches
          });

        } catch (error) {
          this.logError('Failed to embed image', error, {
            filename: imageInfo.filename,
            originalSrc
          });
          
          embeddingResults.push({
            filename: imageInfo.filename,
            originalSrc,
            embedded: false,
            error: error.message
          });
        }
      }
      
      // Update statistics
      this.stats.imagesEmbedded += embeddingResults.filter(r => r.embedded).length;
      this.stats.filesProcessed++;
      
      // Add metadata comment about the embedded images
      if (this.config.includeMetadata) {
        const embeddedMetadata = this.createEmbeddedMetadata(embeddingResults, totalEmbeddedSize);
        combinedHTML = combinedHTML.replace(
          '</head>',
          `${embeddedMetadata}\n</head>`
        );
      }
      
      // Optimize if requested
      if (this.config.optimizeOutput) {
        const originalSize = Buffer.byteLength(combinedHTML, 'utf8');
        combinedHTML = this.optimizeHTML(combinedHTML);
        const optimizedSize = Buffer.byteLength(combinedHTML, 'utf8');
        const savings = originalSize - optimizedSize;
        
        this.stats.optimizationSavings += savings;
        
        this.logOperation('HTML optimized', {
          originalSize: this.formatBytes(originalSize),
          optimizedSize: this.formatBytes(optimizedSize),
          savings: this.formatBytes(savings)
        });
      }
      
      this.logOperation('HTML combination completed', {
        totalImages: generatedImages.length,
        embeddedImages: embeddingResults.filter(r => r.embedded).length,
        failedImages: embeddingResults.filter(r => !r.embedded).length,
        totalEmbeddedSize: this.formatBytes(totalEmbeddedSize)
      });
      
      return combinedHTML;

    }, { operationName: 'combineHTMLWithImages' });
  }

  /**
   * Create a map of original image sources to generated image info
   * @param {Array<Object>} generatedImages - Array of generated image objects
   * @returns {Map} Map of original src to image info
   */
  createImageMap(generatedImages) {
    const imageMap = new Map();
    
    generatedImages.forEach(imageInfo => {
      // Support both new format (originalSrc) and legacy format (originalRef.originalSrc)
      const originalSrc = imageInfo.originalSrc || (imageInfo.originalRef && imageInfo.originalRef.originalSrc);
      
      if (originalSrc) {
        imageMap.set(originalSrc, imageInfo);
        this.logOperation('Added image to map', {
          originalSrc,
          filename: imageInfo.filename,
          filepath: imageInfo.filepath
        });
      } else {
        this.logOperation('Warning: Image missing originalSrc reference', {
          filename: imageInfo.filename || 'unknown',
          keys: Object.keys(imageInfo)
        });
      }
    });
    
    this.logOperation(`Created image map with ${imageMap.size} entries`);
    return imageMap;
  }

  /**
   * Compress image to reduce file size
   * @param {string} filepath - Path to the image file
   * @returns {Promise<Buffer>} Compressed image buffer
   */
  async compressImage(filepath) {
    try {
      const ext = path.extname(filepath).toLowerCase();
      
      this.logOperation('Starting image compression', {
        filepath,
        extension: ext,
        targetSize: this.formatBytes(this.config.targetImageSize)
      });
      
      let sharpInstance = sharp(filepath);
      
      // Get image metadata
      const metadata = await sharpInstance.metadata();
      
      // Resize if image is too large
      const shouldResize = metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight;
      if (shouldResize) {
        sharpInstance = sharpInstance.resize(this.config.maxWidth, this.config.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
        
        this.logOperation('Resizing image', {
          originalSize: `${metadata.width}x${metadata.height}`,
          maxSize: `${this.config.maxWidth}x${this.config.maxHeight}`
        });
      }
      
      // Compress based on format and target size
      let compressedBuffer;
      
      if (ext === '.webp') {
        compressedBuffer = await sharpInstance
          .webp({ 
            quality: this.config.webpQuality,
            effort: 6 // Higher effort for better compression
          })
          .toBuffer();
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        compressedBuffer = await sharpInstance
          .jpeg({ 
            quality: this.config.compressionQuality,
            progressive: true,
            mozjpeg: true // Use mozjpeg encoder for better compression
          })
          .toBuffer();
      } else if (ext === '.png') {
        // Try WebP first for better compression, fallback to PNG
        try {
          compressedBuffer = await sharpInstance
            .webp({ 
              quality: this.config.webpQuality,
              effort: 6 
            })
            .toBuffer();
        } catch (webpError) {
          compressedBuffer = await sharpInstance
            .png({ 
              compressionLevel: 9,
              palette: true // Use palette for smaller files when possible
            })
            .toBuffer();
        }
      } else {
        // For other formats, try to convert to WebP
        compressedBuffer = await sharpInstance
          .webp({ 
            quality: this.config.webpQuality,
            effort: 6 
          })
          .toBuffer();
      }
      
      // If still too large, try more aggressive compression
      if (compressedBuffer.length > this.config.targetImageSize) {
        this.logOperation('Applying aggressive compression', {
          currentSize: this.formatBytes(compressedBuffer.length),
          targetSize: this.formatBytes(this.config.targetImageSize)
        });
        
        // Calculate target quality to reach desired size
        const targetQuality = Math.max(30, Math.floor(this.config.webpQuality * 0.7));
        
        compressedBuffer = await sharp(filepath)
          .resize(this.config.maxWidth * 0.8, this.config.maxHeight * 0.8, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ 
            quality: targetQuality,
            effort: 6 
          })
          .toBuffer();
      }
      
      this.logOperation('Image compression completed', {
        filepath,
        finalSize: this.formatBytes(compressedBuffer.length),
        compressionRatio: `${((1 - compressedBuffer.length / (await this.getFileSize(filepath))) * 100).toFixed(1)}%`
      });
      
      return compressedBuffer;
      
    } catch (error) {
      this.logError('Image compression failed', error, { filepath });
      // Fallback to original file
      return await fs.readFile(filepath);
    }
  }

  /**
   * Convert image file to base64 string
   * @param {string} filepath - Path to the image file
   * @returns {Promise<string>} Base64 encoded image data
   */
  async convertImageToBase64(filepath) {
    try {
      // Validate file exists and is readable
      await fs.access(filepath, fs.constants.R_OK);
      
      const imageBuffer = await fs.readFile(filepath);
      
      this.logOperation('Image converted to base64', {
        filepath,
        size: this.formatBytes(imageBuffer.length)
      });
      
      return imageBuffer.toString('base64');
    } catch (error) {
      this.logError('Failed to convert image to base64', error, { filepath });
      throw new Error(`Failed to read image file: ${filepath}`);
    }
  }

  /**
   * Get MIME type for image file
   * @param {string} filename - Image filename
   * @returns {string} MIME type
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes = {
      '.webp': 'image/webp',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };
    
    const mimeType = mimeTypes[ext] || 'image/png';
    
    this.logOperation('MIME type determined', {
      filename,
      extension: ext,
      mimeType
    });
    
    return mimeType;
  }

  /**
   * Escape special regex characters in string
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create metadata comment about embedded images
   * @param {Array<Object>} embeddingResults - Results of image embedding
   * @param {number} totalSize - Total embedded size in bytes
   * @returns {string} HTML comment with metadata
   */
  createEmbeddedMetadata(embeddingResults, totalSize = 0) {
    const timestamp = new Date().toISOString();
    const embeddedImages = embeddingResults.filter(r => r.embedded);
    const failedImages = embeddingResults.filter(r => !r.embedded);
    const compressedImages = embeddedImages.filter(r => r.compressed);
    
    // Calculate compression statistics
    const totalOriginalSize = embeddedImages.reduce((sum, img) => sum + (img.originalSize || img.size), 0);
    const totalCompressionSavings = totalOriginalSize - totalSize;
    const averageCompressionRatio = totalOriginalSize > 0 ? ((totalCompressionSavings / totalOriginalSize) * 100).toFixed(1) : 0;
    
    let metadata = `
    <!-- 
    🎰 Embedded Images Metadata 🎰
    Generated: ${timestamp}
    Service: HTMLCombinerService v2.1 (with compression)
    Total Images Processed: ${embeddingResults.length}
    Successfully Embedded: ${embeddedImages.length}
    Failed to Embed: ${failedImages.length}
    Images Compressed: ${compressedImages.length}
    Total Embedded Size: ${this.formatBytes(totalSize)}
    Total Original Size: ${this.formatBytes(totalOriginalSize)}
    Compression Savings: ${this.formatBytes(totalCompressionSavings)} (${averageCompressionRatio}%)
    Format: Base64 Data URLs (optimized)
    
    Successfully Embedded Images:`;

    embeddedImages.forEach(img => {
      const compressionInfo = img.compressed 
        ? ` (compressed from ${this.formatBytes(img.originalSize)})`
        : '';
      metadata += `\n    - ${img.filename} (${this.formatBytes(img.size)})${compressionInfo} - ${img.replacements} replacement(s)`;
    });

    if (failedImages.length > 0) {
      metadata += `\n    
    Failed Images:`;
      failedImages.forEach(img => {
        metadata += `\n    - ${img.filename} - Error: ${img.error}`;
      });
    }

    metadata += `\n    
    Processing Statistics:
    - Files Processed: ${this.stats.filesProcessed}
    - Total Images Embedded: ${this.stats.imagesEmbedded}
    - Images Compressed: ${compressedImages.length}
    - Optimization Savings: ${this.formatBytes(this.stats.optimizationSavings)}
    - Compression Savings: ${this.formatBytes(totalCompressionSavings)}
    -->`;
    
    return metadata;
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Save combined HTML to file
   * @param {string} htmlContent - Combined HTML content
   * @param {string} outputPath - Output file path
   * @returns {Promise<object>} File information
   */
  async saveCombinedHTML(htmlContent, outputPath) {
    return await this.executeWithRetry(async () => {
      this.logOperation('Saving combined HTML', { outputPath });
      
      // Validate inputs
      this.validateRequired({ htmlContent, outputPath });
      
      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });
      
      // Create backup if file exists
      let backupPath = null;
      try {
        await fs.access(outputPath);
        backupPath = `${outputPath}.backup.${Date.now()}`;
        await fs.copyFile(outputPath, backupPath);
        this.logOperation('Backup created', { backupPath });
      } catch (error) {
        // File doesn't exist, no backup needed
      }
      
      // Save the combined HTML file
      await fs.writeFile(outputPath, htmlContent, 'utf-8');
      
      // Get file stats
      const stats = await fs.stat(outputPath);
      
      const fileInfo = {
        filepath: outputPath,
        filename: path.basename(outputPath),
        size: stats.size,
        formattedSize: this.formatBytes(stats.size),
        lastModified: stats.mtime,
        backupPath
      };
      
      this.logOperation('Combined HTML saved successfully', {
        filepath: outputPath,
        size: this.formatBytes(stats.size),
        backupCreated: !!backupPath
      });
      
      return fileInfo;

    }, { operationName: 'saveCombinedHTML' });
  }

  /**
   * Create a complete self-contained HTML file
   * @param {string} htmlContent - Original HTML content
   * @param {Array<Object>} generatedImages - Generated images
   * @param {string} outputDir - Output directory
   * @param {string} filename - Output filename (optional)
   * @returns {Promise<Object>} Result with file info
   */
  async createSelfContainedHTML(htmlContent, generatedImages, outputDir, filename = 'index.html') {
    return await this.executeWithRetry(async () => {
      this.logOperation('Creating self-contained HTML file', {
        outputDir,
        filename,
        imageCount: generatedImages.length
      });
      
      // Validate inputs
      this.validateRequired({ htmlContent, generatedImages, outputDir });
      
      // Combine HTML with embedded images
      const combinedHTML = await this.combineHTMLWithImages(htmlContent, generatedImages, outputDir);
      
      // Save combined HTML
      const outputPath = path.join(outputDir, filename);
      const fileInfo = await this.saveCombinedHTML(combinedHTML, outputPath);
      
      const result = {
        success: true,
        ...fileInfo,
        embeddedImages: generatedImages.length,
        timestamp: new Date().toISOString(),
        optimized: this.config.optimizeOutput,
        metadata: this.config.includeMetadata
      };
      
      this.logOperation('Self-contained HTML created successfully', {
        filepath: result.filepath,
        size: result.formattedSize,
        embeddedImages: result.embeddedImages,
        optimized: result.optimized
      });
      
      return result;

    }, { operationName: 'createSelfContainedHTML' });
  }

  /**
   * Optimize embedded HTML for size
   * @param {string} htmlContent - HTML content to optimize
   * @returns {string} Optimized HTML content
   */
  optimizeHTML(htmlContent) {
    this.logOperation('Starting HTML optimization');
    
    let optimized = htmlContent;
    const originalSize = Buffer.byteLength(optimized, 'utf8');
    
    try {
      // Remove unnecessary whitespace while preserving structure
      optimized = optimized.replace(/>\s+</g, '><');
      
      // Remove HTML comments (except our metadata with emoji markers)
      optimized = optimized.replace(/<!--(?!.*🎰)[\s\S]*?-->/g, '');
      
      // Minify CSS (basic minification)
      optimized = optimized.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
        const minifiedCSS = css
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
          .replace(/\s+/g, ' ') // Collapse whitespace
          .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
          .replace(/\s*{\s*/g, '{') // Remove spaces around braces
          .replace(/\s*}\s*/g, '}')
          .replace(/\s*;\s*/g, ';') // Remove spaces around semicolons
          .replace(/\s*:\s*/g, ':') // Remove spaces around colons
          .trim();
        
        return `<style>${minifiedCSS}</style>`;
      });
      
      // Minify inline JavaScript (basic minification)
      optimized = optimized.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
        if (js.includes('src=') || js.trim() === '') {
          return match; // Skip external scripts or empty scripts
        }
        
        const minifiedJS = js
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .replace(/\/\/.*$/gm, '') // Remove single-line comments
          .replace(/\s+/g, ' ') // Collapse whitespace
          .replace(/;\s*}/g, '}') // Clean up semicolons
          .replace(/\s*{\s*/g, '{')
          .replace(/\s*}\s*/g, '}')
          .replace(/\s*;\s*/g, ';')
          .trim();
        
        return match.replace(js, minifiedJS);
      });
      
      // Remove redundant attributes
      optimized = optimized.replace(/\s+type=["']text\/(css|javascript)["']/g, '');
      
      // Trim lines
      optimized = optimized.split('\n').map(line => line.trim()).join('\n');
      
      // Remove empty lines
      optimized = optimized.replace(/^\s*\n/gm, '');
      
      const finalSize = Buffer.byteLength(optimized, 'utf8');
      const savings = originalSize - finalSize;
      const compressionRatio = ((savings / originalSize) * 100).toFixed(2);
      
      this.logOperation('HTML optimization completed', {
        originalSize: this.formatBytes(originalSize),
        optimizedSize: this.formatBytes(finalSize),
        savings: this.formatBytes(savings),
        compressionRatio: `${compressionRatio}%`
      });
      
      return optimized;

    } catch (error) {
      this.logError('HTML optimization failed', error);
      this.logOperation('Returning unoptimized HTML due to error');
      return htmlContent; // Return original on error
    }
  }

  // Helper methods

  /**
   * Estimate total size of images
   * @param {Array<Object>} generatedImages - Generated images
   * @returns {Promise<number>} Total estimated size in bytes
   */
  async estimateTotalSize(generatedImages) {
    let totalSize = 0;
    
    for (const imageInfo of generatedImages) {
      try {
        const size = await this.getFileSize(imageInfo.filepath);
        totalSize += size;
      } catch (error) {
        this.logError('Failed to get image size', error, {
          filepath: imageInfo.filepath
        });
      }
    }
    
    return totalSize;
  }

  /**
   * Get file size
   * @param {string} filepath - Path to file
   * @returns {Promise<number>} File size in bytes
   */
  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      throw new Error(`Cannot access file: ${filepath}`);
    }
  }

  /**
   * Batch process multiple HTML files
   * @param {Array<Object>} htmlFiles - Array of HTML file objects
   * @param {Array<Object>} generatedImages - Generated images
   * @param {string} outputDir - Output directory
   * @returns {Promise<Array>} Array of processing results
   */
  async batchProcessHTML(htmlFiles, generatedImages, outputDir) {
    this.logOperation('Starting batch HTML processing', {
      fileCount: htmlFiles.length,
      imageCount: generatedImages.length,
      outputDir
    });

    const results = [];
    
    for (const htmlFile of htmlFiles) {
      try {
        const result = await this.createSelfContainedHTML(
          htmlFile.content,
          generatedImages,
          outputDir,
          htmlFile.filename
        );
        
        results.push({
          success: true,
          filename: htmlFile.filename,
          result
        });
        
      } catch (error) {
        this.logError('Batch processing failed for file', error, {
          filename: htmlFile.filename
        });
        
        results.push({
          success: false,
          filename: htmlFile.filename,
          error: error.message
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    this.logOperation('Batch HTML processing completed', {
      total: htmlFiles.length,
      successful,
      failed
    });
    
    return results;
  }

  /**
   * Get processing statistics
   * @returns {object} Current processing statistics
   */
  getProcessingStats() {
    const stats = { ...this.stats };
    
    // Calculate additional metrics
    stats.averageImagesPerFile = stats.filesProcessed > 0
      ? Math.round(stats.imagesEmbedded / stats.filesProcessed)
      : 0;
      
    stats.optimizationSavingsFormatted = this.formatBytes(stats.optimizationSavings);
    
    return stats;
  }

  /**
   * Reset processing statistics
   */
  resetStats() {
    this.stats = {
      filesProcessed: 0,
      imagesEmbedded: 0,
      totalSizeReduction: 0,
      optimizationSavings: 0
    };
    
    this.logOperation('Processing statistics reset');
  }

  /**
   * Validate image compatibility
   * @param {string} filepath - Image file path
   * @returns {Promise<boolean>} True if image is compatible
   */
  async validateImageCompatibility(filepath) {
    try {
      const ext = path.extname(filepath).toLowerCase();
      
      if (!this.config.supportedFormats.includes(ext)) {
        return false;
      }
      
      // Check if file exists and is readable
      await fs.access(filepath, fs.constants.R_OK);
      
      // Check file size
      const size = await this.getFileSize(filepath);
      if (size > this.config.maxImageSize) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }
}

module.exports = HTMLCombinerService;
