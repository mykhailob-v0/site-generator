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
      targetImageSize: 30 * 1024, // 30KB target per image (reduced from 50KB)
      maxHtmlSize: 5 * 1024 * 1024, // 5MB max HTML file
      compressionQuality: 75, // 75% quality for JPEG compression
      webpQuality: 85, // 85% quality for WebP (increased for better small image quality)
      maxWidth: 1200, // Max width for large images like hero backgrounds
      maxHeight: 800, // Max height for large images
      enableImageCompression: true,
      enableSmartSizing: true, // New feature flag
      retinaScaling: 2, // 2x scaling for retina displays
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
          // Check individual image size
          const originalImageSize = await this.getFileSize(imageInfo.filepath);
          
          let processedImageBuffer;
          let finalImageSize;
          
          if (this.config.enableImageCompression && originalImageSize > this.config.targetImageSize) {
            // Compress the image before embedding with smart sizing
            processedImageBuffer = await this.compressImage(imageInfo.filepath, imageRef, combinedHTML);
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
   * Parse CSS to determine optimal image dimensions
   * @param {string} htmlContent - HTML content containing CSS
   * @param {string} imageSrc - Image source to find sizing for
   * @returns {Object} Optimal dimensions {width, height, context}
   */
  parseImageDimensions(htmlContent, imageSrc) {
    const imageBaseName = imageSrc.split('/').pop().split('.')[0].split('-')[0]; // e.g., "icon" from "icon-security-Brand-123.webp"
    
    // Define size mappings based on CSS analysis
    const sizePresets = {
      'favicon': { width: 32, height: 32, context: 'brand favicon' },
      'icon': { width: 28, height: 28, context: 'feature icon' },
      'campaign': { width: 220, height: 165, context: 'campaign image' }, // 4:3 aspect ratio
      'hero': { width: 1200, height: 600, context: 'hero background' },
      'section': { width: 600, height: 400, context: 'section image' }
    };
    
    // Extract CSS rules to find specific sizing
    const cssRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let match;
    const cssRules = [];
    
    while ((match = cssRegex.exec(htmlContent)) !== null) {
      cssRules.push(match[1]);
    }
    
    const fullCSS = cssRules.join('\n');
    
    // Look for specific class or context-based sizing
    const sizePatterns = [
      // Brand images (favicon)
      { pattern: /\.brand\s+img\s*\{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/i, context: 'brand', priority: 1 },
      { pattern: /\.brand\s+img\s*\{[^}]*width:\s*(\d+)px/i, context: 'brand', priority: 1 },
      
      // Badge images (small icons in badges)
      { pattern: /\.badge\s+img\s*\{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/i, context: 'badge', priority: 2 },
      { pattern: /\.badge\s+img\s*\{[^}]*width:\s*(\d+)px/i, context: 'badge', priority: 2 },
      
      // Kicker images (small icons in kicker elements)
      { pattern: /\.kicker\s+img\s*\{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/i, context: 'kicker', priority: 2 },
      { pattern: /\.kicker\s+img\s*\{[^}]*width:\s*(\d+)px/i, context: 'kicker', priority: 2 },
      
      // Feature icons (main content icons)
      { pattern: /\.icon\s*\{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/i, context: 'icon', priority: 3 },
      { pattern: /\.icon\s*\{[^}]*width:\s*(\d+)px/i, context: 'icon', priority: 3 },
      
      // Campaign images (promotional banners)
      { pattern: /\.campaign\s+img\s*\{[^}]*width:\s*(\d+)px/i, context: 'campaign', priority: 4 },
      { pattern: /\.campaign\s*\{[^}]*grid-template-columns:\s*(\d+)px/i, context: 'campaign', priority: 4 },
      
      // Hero backgrounds (large images)
      { pattern: /\.hero[^{]*\{[^}]*background:[^}]*url\([^)]+\)[^}]*\}/i, context: 'hero', priority: 5 }
    ];
    
    // Try to find specific CSS sizing with priority order
    for (const { pattern, context, priority } of sizePatterns.sort((a, b) => a.priority - b.priority)) {
      const matches = pattern.exec(fullCSS);
      if (matches && matches[1]) {
        const width = parseInt(matches[1]);
        const height = parseInt(matches[2]) || width; // Square if only width found
        
        // Special handling for campaign images (maintain aspect ratio)
        let finalHeight = height;
        if (context === 'campaign' && !matches[2]) {
          finalHeight = Math.floor(width * 0.75); // 4:3 aspect ratio
        }
        
        if (width > 0 && width <= 2000) { // Reasonable bounds
          this.logOperation('Found CSS-based dimensions', {
            imageSrc,
            context,
            width,
            height: finalHeight,
            priority,
            cssMatch: matches[0].substring(0, 100) + '...'
          });
          
          return { 
            width: Math.max(width, 16), // Minimum 16px
            height: Math.max(finalHeight, 16), 
            context: `${context} (CSS-derived)` 
          };
        }
      }
    }
    
    // Fallback to preset based on image type
    let bestMatch = sizePresets['icon']; // Default fallback
    
    for (const [type, preset] of Object.entries(sizePresets)) {
      if (imageBaseName.includes(type) || imageSrc.includes(type)) {
        bestMatch = preset;
        break;
      }
    }
    
    this.logOperation('Using preset dimensions', {
      imageSrc,
      imageBaseName,
      preset: bestMatch
    });
    
    return bestMatch;
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
      
      // Determine optimal dimensions based on CSS and context
      const optimalDimensions = imageSrc && htmlContent 
        ? this.parseImageDimensions(htmlContent, imageSrc)
        : { width: this.config.maxWidth, height: this.config.maxHeight, context: 'default fallback' };
      
      this.logOperation('Starting smart image compression', {
        filepath,
        extension: ext,
        optimalDimensions,
        targetSize: this.formatBytes(this.config.targetImageSize)
      });
      
      let sharpInstance = sharp(filepath);
      
      // Get image metadata
      const metadata = await sharpInstance.metadata();
      
      // Use optimal dimensions with 2x scaling for retina displays
      const targetWidth = Math.min(optimalDimensions.width * 2, this.config.maxWidth);
      const targetHeight = Math.min(optimalDimensions.height * 2, this.config.maxHeight);
      
      // Resize to optimal dimensions
      const shouldResize = metadata.width > targetWidth || metadata.height > targetHeight;
      if (shouldResize) {
        sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
        
        this.logOperation('Smart resizing image', {
          originalSize: `${metadata.width}x${metadata.height}`,
          targetSize: `${targetWidth}x${targetHeight}`,
          context: optimalDimensions.context,
          retinaScaling: '2x'
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
        
        // Use slightly smaller dimensions for aggressive compression
        const aggressiveWidth = Math.floor(targetWidth * 0.8);
        const aggressiveHeight = Math.floor(targetHeight * 0.8);
        
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
