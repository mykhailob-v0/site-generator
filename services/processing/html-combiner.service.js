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
      maxImageSize: 100 * 1024, // 100KB per image for icons/small images
      maxTotalSize: 5 * 1024 * 1024, // 5MB total (increased for hero images)
      targetImageSize: 30 * 1024, // 30KB target per icon/small image
      maxHtmlSize: 8 * 1024 * 1024, // 8MB max HTML file (increased)
      compressionQuality: 75, // 75% quality for JPEG compression
      webpQuality: 85, // 85% quality for WebP
      maxWidth: 800, // Max width for large images like hero backgrounds
      maxHeight: 600, // Max height for large images
      enableImageCompression: true,
      enableSmartSizing: true, // New feature flag
      retinaScaling: 2, // 2x scaling for retina displays
      
      // Context-specific size limits
      imageSizeLimits: {
        'hero': { max: 300 * 1024, target: 200 * 1024, quality: 90 }, // 300KB max, 200KB target for hero
        'campaign': { max: 150 * 1024, target: 100 * 1024, quality: 88 }, // 150KB max for campaigns
        'icon': { max: 50 * 1024, target: 30 * 1024, quality: 85 }, // 50KB max for icons
        'favicon': { max: 20 * 1024, target: 15 * 1024, quality: 80 }, // 20KB max for favicon
        'default': { max: 100 * 1024, target: 50 * 1024, quality: 85 } // Default fallback
      },
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
      
      // First, find all image references in HTML
      const imageReferences = this.findImageReferencesInHTML(combinedHTML);
      this.logOperation('Found image references in HTML', {
        references: imageReferences,
        count: imageReferences.length
      });
      
      // Replace image references with base64 data URLs
      for (const imageRef of imageReferences) {
        let imageInfo = imageMap.get(imageRef);
        
        // If not found, try fallback mappings
        if (!imageInfo) {
          for (const [src, info] of imageMap.entries()) {
            if (this.isImageMatch(imageRef, src)) {
              imageInfo = info;
              this.logOperation('Using fallback mapping', {
                requestedSrc: imageRef,
                foundSrc: src,
                filename: info.filename
              });
              break;
            }
          }
        }
        
        if (!imageInfo) {
          this.logOperation('Warning: Image not found for reference', {
            reference: imageRef,
            availableImages: Array.from(imageMap.keys())
          });
          embeddingResults.push({
            filename: imageRef,
            originalSrc: imageRef,
            embedded: false,
            error: 'Image file not found'
          });
          continue;
        }
        
        try {
          const originalSrc = imageRef;
          // Determine image context for smart sizing
          const imageContext = this.getImageContext(imageRef, combinedHTML);
          const sizeLimits = this.config.imageSizeLimits[imageContext] || this.config.imageSizeLimits.default;
          
          // Check individual image size
          const originalImageSize = await this.getFileSize(imageInfo.filepath);
          
          let processedImageBuffer;
          let finalImageSize;
          
          if (this.config.enableImageCompression && originalImageSize > sizeLimits.target) {
            // Compress the image before embedding with smart sizing
            processedImageBuffer = await this.compressImage(imageInfo.filepath, imageRef, combinedHTML);
            finalImageSize = processedImageBuffer.length;
            
            this.logOperation('Smart image compression completed', {
              filename: imageInfo.filename,
              context: imageContext,
              originalSize: this.formatBytes(originalImageSize),
              compressedSize: this.formatBytes(finalImageSize),
              savings: this.formatBytes(originalImageSize - finalImageSize),
              targetLimit: this.formatBytes(sizeLimits.target),
              maxLimit: this.formatBytes(sizeLimits.max)
            });
          } else {
            // Use original image if it's already small enough
            processedImageBuffer = await fs.readFile(imageInfo.filepath);
            finalImageSize = processedImageBuffer.length;
          }
          
          // Skip if still too large after compression (use context-specific limit)
          if (finalImageSize > sizeLimits.max) {
            this.logOperation('Skipping large image even after compression', {
              filename: imageInfo.filename,
              context: imageContext,
              size: this.formatBytes(finalImageSize),
              maxSize: this.formatBytes(sizeLimits.max)
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
    
    // Create fallback mappings for common naming mismatches
    const fallbackMappings = {
      'icon-lock': 'icon-security',
      'icon-verified': 'icon-shield', 
      'icon-phone': 'icon-mobile',
      'icon-wallet': 'icon-payment',
      'icon-headset': 'icon-support'
    };
    
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
        
        // Add fallback mappings - check if this image can serve as a fallback for other names
        const imageName = originalSrc.split('/').pop().split('.')[0]; // Extract base name
        const baseImageName = imageName.split('-').slice(0, -2).join('-'); // Remove timestamp and ID
        
        Object.entries(fallbackMappings).forEach(([missingName, generatedName]) => {
          if (baseImageName.includes(generatedName)) {
            const fallbackSrc = originalSrc.replace(baseImageName, baseImageName.replace(generatedName, missingName));
            if (!imageMap.has(fallbackSrc)) {
              imageMap.set(fallbackSrc, imageInfo);
              this.logOperation('Added fallback mapping', {
                fallbackSrc,
                actualSrc: originalSrc,
                mapping: `${missingName} → ${generatedName}`
              });
            }
          }
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
   * Determine image context from filename and HTML usage
   * @param {string} imageSrc - Image source path
   * @param {string} htmlContent - HTML content for context analysis  
   * @returns {string} Image context ('hero', 'icon', 'campaign', 'favicon', 'default')
   */
  getImageContext(imageSrc, htmlContent = '') {
    const filename = imageSrc.split('/').pop().toLowerCase();
    const imageBaseName = filename.split('.')[0].split('-')[0]; // e.g., "icon" from "icon-security-Brand-123.webp"
    
    // Check filename patterns first
    if (filename.includes('favicon') || imageBaseName === 'favicon') {
      return 'favicon';
    }
    
    if (filename.includes('hero') || imageBaseName === 'hero') {
      return 'hero';
    }
    
    if (filename.includes('campaign') || imageBaseName === 'campaign') {
      return 'campaign';
    }
    
    if (filename.includes('icon') || imageBaseName === 'icon') {
      return 'icon';
    }
    
    if (filename.includes('section') || imageBaseName === 'section') {
      return 'campaign'; // Treat section images like campaign images
    }
    
    // Check HTML context if available
    if (htmlContent && imageSrc) {
      // Look for hero context in CSS/HTML
      if (htmlContent.includes('hero') && htmlContent.includes(imageSrc)) {
        return 'hero';
      }
      
      // Look for campaign context
      if (htmlContent.includes('campaign') && htmlContent.includes(imageSrc)) {
        return 'campaign';
      }
    }
    
    // Default fallback
    return 'default';
  }

  /**
   * Parse image dimensions from HTML img tag attributes
   * @param {string} htmlContent - HTML content to search
   * @param {string} imageSrc - Image source to find
   * @returns {Object} Optimal dimensions {width, height, context}
   */
  parseImageDimensions(htmlContent, imageSrc) {
    // First, try to find the img tag with explicit width/height attributes
    const escapedSrc = this.escapeRegExp(imageSrc);
    const imgTagRegex = new RegExp(`<img[^>]*src=["']${escapedSrc}["'][^>]*>`, 'gi');
    const imgMatch = htmlContent.match(imgTagRegex);
    
    if (imgMatch && imgMatch[0]) {
      const imgTag = imgMatch[0];
      
      // Extract width and height attributes
      const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
      const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
      
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1]);
        const height = parseInt(heightMatch[1]);
        
        this.logOperation('Found explicit image dimensions', {
          imageSrc,
          width,
          height,
          imgTag: imgTag.substring(0, 100) + '...'
        });
        
        return {
          width,
          height,
          context: this.getImageContextFromDimensions(width, height, imageSrc)
        };
      }
    }
    
    // Fallback: use filename-based detection for backward compatibility
    const imageBaseName = imageSrc.split('/').pop().split('.')[0].split('-')[0]; // e.g., "icon" from "icon-security-Brand-123.webp"
    
    // Define size mappings based on common patterns
    const sizePresets = {
      'favicon': { width: 32, height: 32, context: 'brand favicon' },
      'icon': { width: 64, height: 64, context: 'feature icon' },
      'campaign': { width: 400, height: 300, context: 'campaign image' },
      'hero': { width: 1200, height: 675, context: 'hero background' },
      'section': { width: 400, height: 400, context: 'section image' }
    };
    
    // Find best match based on filename
    let bestMatch = sizePresets['icon']; // Default fallback
    
    for (const [type, preset] of Object.entries(sizePresets)) {
      if (imageBaseName.includes(type) || imageSrc.includes(type)) {
        bestMatch = preset;
        break;
      }
    }
    
    this.logOperation('Using fallback dimensions', {
      imageSrc,
      imageBaseName,
      preset: bestMatch
    });
    
    return bestMatch;
  }

  /**
   * Determine image context from dimensions
   * @param {number} width - Image width
   * @param {number} height - Image height  
   * @param {string} imageSrc - Image source for additional context
   * @returns {string} Image context description
   */
  getImageContextFromDimensions(width, height, imageSrc) {
    // Determine context based on size ranges and filename
    const area = width * height;
    const aspectRatio = width / height;
    const filename = imageSrc.toLowerCase();
    
    // Very large images (hero backgrounds)
    if (area > 500000) { // > 500k pixels (e.g., 1200x675 = 810k)
      return 'hero background (HTML-defined)';
    }
    
    // Large images (feature/campaign images)
    if (area > 100000) { // > 100k pixels (e.g., 600x400 = 240k)
      return 'large feature image (HTML-defined)';
    }
    
    // Medium images (campaign banners)
    if (area > 50000) { // > 50k pixels (e.g., 400x300 = 120k)
      return 'campaign image (HTML-defined)';
    }
    
    // Small square icons
    if (width === height && area <= 5000) { // Square and <= 5k pixels (e.g., 64x64 = 4k)
      if (filename.includes('favicon')) return 'favicon (HTML-defined)';
      return 'small icon (HTML-defined)';
    }
    
    // Medium icons
    if (area <= 10000) { // <= 10k pixels 
      return 'medium icon (HTML-defined)';
    }
    
    // Default context
    return `image ${width}x${height} (HTML-defined)`;
  }

  /**
   * Compress image to reduce file size with smart sizing
   * @param {string} filepath - Path to the image file
   * @param {string} imageSrc - Original image src for context
   * @param {string} htmlContent - HTML content for CSS parsing
   * @returns {Promise<Buffer>} Compressed image buffer
   */
  async compressImage(filepath, imageSrc = '', htmlContent = '') {
    try {
      const ext = path.extname(filepath).toLowerCase();
      
      // Determine context and quality settings
      const imageContext = imageSrc ? this.getImageContext(imageSrc, htmlContent) : 'default';
      const sizeLimits = this.config.imageSizeLimits[imageContext] || this.config.imageSizeLimits.default;
      
      // Determine optimal dimensions based on CSS and context
      const optimalDimensions = imageSrc && htmlContent 
        ? this.parseImageDimensions(htmlContent, imageSrc)
        : { width: this.config.maxWidth, height: this.config.maxHeight, context: 'default fallback' };
      
      this.logOperation('Starting context-aware image compression', {
        filepath,
        extension: ext,
        imageContext,
        optimalDimensions,
        sizeLimits: {
          max: this.formatBytes(sizeLimits.max),
          target: this.formatBytes(sizeLimits.target),
          quality: sizeLimits.quality
        }
      });
      
      let sharpInstance = sharp(filepath);
      
      // Get image metadata
      const metadata = await sharpInstance.metadata();
      
      // Use optimal dimensions with retina scaling (but limit for icons)
      const retinaMultiplier = imageContext === 'icon' || imageContext === 'favicon' ? 1 : 2;
      const targetWidth = Math.min(optimalDimensions.width * retinaMultiplier, this.config.maxWidth);
      const targetHeight = Math.min(optimalDimensions.height * retinaMultiplier, this.config.maxHeight);
      
      // Resize to optimal dimensions
      const shouldResize = metadata.width > targetWidth || metadata.height > targetHeight;
      if (shouldResize) {
        sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
        
        this.logOperation('Context-aware resizing', {
          originalSize: `${metadata.width}x${metadata.height}`,
          targetSize: `${targetWidth}x${targetHeight}`,
          context: imageContext,
          retinaMultiplier: `${retinaMultiplier}x`
        });
      }
      
      // Compress based on format with context-specific quality
      let compressedBuffer;
      
      if (ext === '.webp') {
        compressedBuffer = await sharpInstance
          .webp({ 
            quality: sizeLimits.quality,
            effort: 6 // Higher effort for better compression
          })
          .toBuffer();
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        compressedBuffer = await sharpInstance
          .jpeg({ 
            quality: Math.max(sizeLimits.quality - 5, 70), // Slightly lower quality for JPEG
            progressive: true,
            mozjpeg: true // Use mozjpeg encoder for better compression
          })
          .toBuffer();
      } else if (ext === '.png') {
        // Try WebP first for better compression, fallback to PNG
        try {
          compressedBuffer = await sharpInstance
            .webp({ 
              quality: sizeLimits.quality,
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
        // For other formats, try to convert to WebP with context quality
        compressedBuffer = await sharpInstance
          .webp({ 
            quality: sizeLimits.quality,
            effort: 6 
          })
          .toBuffer();
      }
      
      // If still too large, try more aggressive compression (context-aware)
      if (compressedBuffer.length > sizeLimits.target) {
        this.logOperation('Applying aggressive compression', {
          currentSize: this.formatBytes(compressedBuffer.length),
          targetSize: this.formatBytes(sizeLimits.target),
          context: imageContext
        });
        
        // Calculate target quality to reach desired size (context-aware)
        const targetQuality = Math.max(60, Math.floor(sizeLimits.quality * 0.7));
        
        // Use slightly smaller dimensions for aggressive compression (less aggressive for hero images)
        const compressionFactor = imageContext === 'hero' ? 0.9 : 0.8;
        const aggressiveWidth = Math.floor(targetWidth * compressionFactor);
        const aggressiveHeight = Math.floor(targetHeight * compressionFactor);
        
        compressedBuffer = await sharp(filepath)
          .resize(aggressiveWidth, aggressiveHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ 
            quality: targetQuality,
            effort: 6 
          })
          .toBuffer();
      }
      
      this.logOperation('Context-aware image compression completed', {
        filepath,
        context: imageContext,
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
      // First, extract and preserve JSON-LD scripts to avoid breaking them
      const jsonLdScripts = [];
      optimized = optimized.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
        const index = jsonLdScripts.length;
        jsonLdScripts.push(match); // Store the entire script tag with original formatting
        return `___JSON_LD_PLACEHOLDER_${index}___`;
      });
      
      // Remove unnecessary whitespace while preserving structure (but not inside JSON-LD)
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
      
      // Minify inline JavaScript (conservative minification) - but skip JSON-LD and preserve structure
      optimized = optimized.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (match, js) => {
        if (js.includes('src=') || js.trim() === '' || match.includes('application/ld+json')) {
          return match; // Skip external scripts, empty scripts, or JSON-LD scripts
        }
        
        // Very conservative JavaScript minification that preserves functionality
        let minifiedJS = js
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .replace(/\/\/.*$/gm, '') // Remove single-line comments
          .replace(/\n\s*\n/g, '\n') // Remove empty lines
          .split('\n')
          .map(line => line.trim()) // Trim each line
          .filter(line => line.length > 0) // Remove empty lines
          .join(''); // Join without newlines but preserve all spaces within lines
        
        return match.replace(js, minifiedJS);
      });
      
      // Restore JSON-LD scripts with original formatting
      jsonLdScripts.forEach((script, index) => {
        optimized = optimized.replace(`___JSON_LD_PLACEHOLDER_${index}___`, script);
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

  /**
   * Find all image references in HTML content
   * @param {string} html - HTML content to scan
   * @returns {string[]} Array of image src attributes
   */
  findImageReferencesInHTML(html) {
    const imageRefs = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const cssUrlRegex = /url\(['"]?([^'")\s]+)['"]?\)/gi;
    
    let match;
    
    // Find img src attributes
    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      if (src.startsWith('assets/images/') && !imageRefs.includes(src)) {
        imageRefs.push(src);
      }
    }
    
    // Find CSS url() references
    html.replace(cssUrlRegex, (fullMatch, src) => {
      if (src.startsWith('assets/images/') && !imageRefs.includes(src)) {
        imageRefs.push(src);
      }
      return fullMatch;
    });
    
    return imageRefs;
  }

  /**
   * Check if an image reference matches an available image
   * @param {string} requestedSrc - The image src requested in HTML
   * @param {string} availableSrc - The image src available in the map
   * @returns {boolean} Whether they match
   */
  isImageMatch(requestedSrc, availableSrc) {
    // Direct match
    if (requestedSrc === availableSrc) {
      return true;
    }
    
    // Extract base names (without extension and path)
    const getBaseName = (src) => {
      return src.split('/').pop().split('.')[0];
    };
    
    const requestedBase = getBaseName(requestedSrc);
    const availableBase = getBaseName(availableSrc);
    
    // Check if the available image is a timestamped version of the requested one
    // Example: icon-lock-Brand vs icon-security-Brand-1234567890-abcdef
    const availableWithoutTimestamp = availableBase.replace(/-\d+-[a-z0-9]+$/, '');
    
    // Define common naming alternatives
    const alternatives = {
      'icon-lock': ['icon-security', 'icon-shield'],
      'icon-verified': ['icon-shield', 'icon-security'],
      'icon-phone': ['icon-mobile', 'icon-headset'],
      'icon-wallet': ['icon-payment'],
      'icon-headset': ['icon-support', 'icon-phone']
    };
    
    // Check if requested name matches available name after removing timestamp
    if (requestedBase === availableWithoutTimestamp) {
      return true;
    }
    
    // Check alternatives
    const requestedType = requestedBase.split('-').slice(0, 2).join('-'); // e.g., "icon-lock"
    const availableType = availableWithoutTimestamp.split('-').slice(0, 2).join('-'); // e.g., "icon-security"
    
    if (alternatives[requestedType] && alternatives[requestedType].includes(availableType)) {
      return true;
    }
    
    return false;
  }
}

module.exports = HTMLCombinerService;
