const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ImageGeneratorService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey
    });
    
    this.model = 'gpt-image-1'; // Using the new GPT-Image-1 model
  }

  /**
   * Generate images based on enhanced references with AI-generated prompts
   * @param {Array<Object>} enhancedImageReferences - Array of enhanced image references with AI prompts
   * @param {Object} params - Generation parameters
   * @param {string} params.primaryKeyword - Primary keyword for context
   * @param {string} params.outputDir - Directory to save images
   * @returns {Promise<Array<Object>>} Generated images info
   */
  async generateImagesFromEnhancedReferences(enhancedImageReferences, params) {
    try {
      const { primaryKeyword, outputDir } = params;
      const generatedImages = [];
      
      console.log(`🎨 Generating ${enhancedImageReferences.length} images with AI-generated prompts...`);
      
      for (const imageRef of enhancedImageReferences) {
        try {
          console.log(`🖼️  Generating: ${imageRef.filename}`);
          console.log(`🤖 Using ${imageRef.promptSource || 'ai-generated'} prompt`);
          
          // Use AI-generated prompt or fallback to original method
          const prompt = imageRef.aiGeneratedPrompt || this.createImagePrompt(imageRef, primaryKeyword);
          
          // Use AI size recommendation or determine based on filename
          const rawSize = imageRef.sizeRecommendation || this.determineImageSize(imageRef);
          const size = this.validateAndCorrectSize(rawSize);
          
          // Generate image using GPT-Image-1
          const response = await this.client.images.generate({
            model: this.model,
            prompt: prompt,
            n: 1,
            size: size,
            quality: 'high'
          });

          const imageUrl = response.data[0].url;
          
          // Create WebP filename
          const webpFilename = this.convertToWebPFilename(imageRef.filename);
          const filepath = path.join(outputDir, imageRef.directory, webpFilename);

          // Download image and convert to WebP
          await this.downloadAndConvertToWebP(imageUrl, filepath);
          
          generatedImages.push({
            originalRef: imageRef,
            filename: webpFilename,
            filepath: filepath,
            url: imageUrl,
            size: size,
            prompt: prompt,
            aiGenerated: true,
            contextAnalysis: imageRef.contextAnalysis
          });

          console.log(`✅ Generated: ${webpFilename}`);
          
          // Add delay to respect rate limits
          await this.delay(2000);
          
        } catch (imageError) {
          console.error(`❌ Failed to generate ${imageRef.filename}:`, imageError.message);
          
          // Create a placeholder image if generation fails
          const placeholderPath = await this.createPlaceholderWebP(imageRef, outputDir);
          generatedImages.push({
            originalRef: imageRef,
            filename: this.convertToWebPFilename(imageRef.filename),
            filepath: placeholderPath,
            isPlaceholder: true,
            contextAnalysis: imageRef.contextAnalysis
          });
        }
      }

      console.log(`🎉 Successfully generated ${generatedImages.length} images with AI prompts`);
      return generatedImages;
    } catch (error) {
      console.error('❌ Error generating images from enhanced references:', error.message);
      throw new Error(`Enhanced image generation failed: ${error.message}`);
    }
  }

  /**
   * Create appropriate image prompt based on image reference
   * @param {Object} imageRef - Image reference object
   * @param {string} primaryKeyword - Primary keyword for context
   * @returns {string} Generated prompt for the image
   */
  createImagePrompt(imageRef, primaryKeyword) {
    const filename = imageRef.filename.toLowerCase();
    const directory = imageRef.directory.toLowerCase();
    
    // Determine image type from filename/directory
    if (filename.includes('hero') || filename.includes('background')) {
      return `Professional hero background image for Turkish gambling site "${primaryKeyword}". Dark blue gradient (#0d1421 to #1a2f4a) with subtle gold accents (#f5c542). Modern geometric patterns, casino chips, sports elements. Abstract, sophisticated, no text. 18+ appropriate. Turkish cultural elements. Professional lighting. Web banner style.`;
    }
    
    if (filename.includes('icon') || directory.includes('icon')) {
      if (filename.includes('security')) {
        return `Modern security icon for gambling website. Shield with checkmark or lock symbol. Blue background (#0d1421), gold icon (#f5c542). Clean vector style, professional, minimalist. 3D effect. SSL/security theme. High contrast, web-ready.`;
      }
      
      if (filename.includes('mobile')) {
        return `Mobile phone icon for betting app. Smartphone silhouette with responsive design elements. Blue gradient background, gold phone outline. Modern flat design. App symbols on screen. Professional, clean, minimalist.`;
      }
      
      if (filename.includes('support') || filename.includes('contact')) {
        return `Customer support icon for gambling site. Headset or chat bubble symbol. Professional service representative silhouette. Blue background, gold icons. Modern, trustworthy, friendly appearance. 24/7 support theme.`;
      }
      
      if (filename.includes('payment')) {
        return `Secure payment icon for betting platform. Credit cards with security shield. Blue background (#0d1421), gold elements (#f5c542). SSL lock symbol, bank security. Professional, trustworthy design. Financial security theme.`;
      }
      
      // Generic icon
      return `Professional icon for Turkish betting website "${primaryKeyword}". Blue background (#0d1421), gold symbol (#f5c542). Clean vector design, modern minimalist style. Gambling/sports theme appropriate. High contrast, web-optimized.`;
    }
    
    if (filename.includes('favicon')) {
      return `Favicon logo for "${primaryKeyword}" betting site. Letter "P" or casino/sports symbol. Blue circle background (#0d1421), gold symbol (#f5c542). Simple, recognizable at 16x16 pixels. Professional brand identity. Gambling industry appropriate.`;
    }
    
    if (filename.includes('campaign') || filename.includes('bonus')) {
      if (filename.includes('welcome')) {
        return `Welcome bonus campaign image for Turkish betting site "${primaryKeyword}". Gift box, golden coins, welcome text in Turkish. Professional gold and blue design. Festive but sophisticated. 18+ appropriate. No specific amounts. Celebration theme.`;
      }
      
      if (filename.includes('vip')) {
        return `VIP program illustration for "${primaryKeyword}" betting platform. Crown, diamond, luxury symbols. Gold and dark blue color scheme. Premium, exclusive design. High-end casino theme. Professional sophistication. Turkish market appropriate.`;
      }
      
      return `Bonus campaign image for Turkish gambling site "${primaryKeyword}". Golden elements, promotional design. Blue and gold color scheme. Professional, attractive, 18+ appropriate. Turkish cultural sensitivity. Modern promotional style.`;
    }
    
    if (filename.includes('faq') || filename.includes('help')) {
      return `FAQ support illustration for betting website. Question mark with helpful symbols. Professional blue background, gold accents. Friendly but trustworthy design. Information and help theme. Modern, clean aesthetic.`;
    }
    
    // Default prompt for unrecognized images
    return `Professional image for Turkish betting website "${primaryKeyword}". Blue and gold color scheme (#0d1421, #f5c542). Modern, sophisticated design. 18+ gambling appropriate. Turkish market suitable. High quality, web-ready. Professional aesthetic.`;
  }

  /**
   * Determine appropriate image size based on image reference
   * @param {Object} imageRef - Image reference object
   * @returns {string} Image size specification
   */
  determineImageSize(imageRef) {
    const filename = imageRef.filename.toLowerCase();
    
    // GPT-Image-1 only supports: '1024x1024', '1024x1536', '1536x1024', and 'auto'
    
    if (filename.includes('hero') || filename.includes('background')) {
      return '1536x1024'; // Wide format for hero/background
    }
    
    if (filename.includes('campaign')) {
      return '1024x1536'; // Portrait format for campaigns
    }
    
    // Default to square for icons, favicons, and other images
    return '1024x1024';
  }

  /**
   * Validate and correct size recommendation to supported values
   * @param {string} size - Size recommendation from AI or other source
   * @returns {string} Valid size for OpenAI API
   */
  validateAndCorrectSize(size) {
    const validSizes = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
    
    // If size is already valid, return it
    if (validSizes.includes(size)) {
      return size;
    }
    
    // Convert common invalid sizes to valid ones
    if (typeof size === 'string') {
      const cleanSize = size.replace(/[^\dx]/g, ''); // Remove extra characters
      
      // Check for wide formats (landscape)
      if (cleanSize.includes('1792x1024') || cleanSize.includes('1920x1080') || 
          size.toLowerCase().includes('wide') || size.toLowerCase().includes('landscape')) {
        return '1536x1024';
      }
      
      // Check for tall formats (portrait)  
      if (cleanSize.includes('1024x1792') || cleanSize.includes('1080x1920') ||
          size.toLowerCase().includes('portrait') || size.toLowerCase().includes('tall')) {
        return '1024x1536';
      }
      
      // Check for square or small sizes
      if (cleanSize.includes('1024x1024') || cleanSize.includes('512x512') ||
          cleanSize.includes('256x256') || cleanSize.includes('128x128') ||
          size.toLowerCase().includes('square') || size.toLowerCase().includes('icon')) {
        return '1024x1024';
      }
    }
    
    // Default fallback
    return '1024x1024';
  }

  /**
   * Convert filename to WebP format
   * @param {string} filename - Original filename
   * @returns {string} WebP filename
   */
  convertToWebPFilename(filename) {
    const baseName = path.parse(filename).name;
    return `${baseName}.webp`;
  }

  /**
   * Download image from URL and convert to WebP format
   * @param {string} imageUrl - URL of the image to download
   * @param {string} filepath - Local file path to save the WebP image
   */
  async downloadAndConvertToWebP(imageUrl, filepath) {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Convert to WebP using Sharp
      const webpBuffer = await sharp(buffer)
        .webp({ 
          quality: 90,
          effort: 6, // Maximum compression effort
          lossless: false 
        })
        .toBuffer();
      
      await fs.writeFile(filepath, webpBuffer);
      
      console.log(`🎯 Converted to WebP: ${path.basename(filepath)}`);
      
    } catch (error) {
      throw new Error(`Failed to save WebP image: ${error.message}`);
    }
  }

  /**
   * Create a placeholder WebP image if generation fails
   * @param {Object} imageRef - Image reference object
   * @param {string} outputDir - Output directory
   * @returns {Promise<string>} Path to placeholder image
   */
  async createPlaceholderWebP(imageRef, outputDir) {
    const webpFilename = this.convertToWebPFilename(imageRef.filename);
    const filepath = path.join(outputDir, imageRef.directory, webpFilename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    // Create a more sophisticated placeholder based on image type
    const filename = imageRef.filename.toLowerCase();
    let svgContent;
    
    if (filename.includes('hero') || filename.includes('background')) {
      // Hero background placeholder
      svgContent = `<svg width="1792" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0d1421;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#1a2f4a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f5c542;stop-opacity:0.3" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#heroGrad)"/>
        <circle cx="200" cy="200" r="80" fill="#f5c542" opacity="0.1"/>
        <circle cx="1500" cy="800" r="120" fill="#f5c542" opacity="0.05"/>
        <rect x="100" y="400" width="200" height="4" fill="#f5c542" opacity="0.3"/>
        <rect x="1300" y="300" width="300" height="4" fill="#f5c542" opacity="0.2"/>
      </svg>`;
    } else if (filename.includes('icon')) {
      // Icon placeholders with relevant symbols
      let iconSymbol = '';
      let iconColor = '#f5c542';
      
      if (filename.includes('security')) {
        iconSymbol = `<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="${iconColor}" stroke-width="2" fill="none"/>
                     <path d="M9 12l2 2 4-4" stroke="${iconColor}" stroke-width="2" fill="none"/>`;
      } else if (filename.includes('mobile')) {
        iconSymbol = `<rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke="${iconColor}" stroke-width="2" fill="none"/>
                     <line x1="12" y1="18" x2="12.01" y2="18" stroke="${iconColor}" stroke-width="2"/>`;
      } else if (filename.includes('support')) {
        iconSymbol = `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="${iconColor}" stroke-width="2" fill="none"/>`;
      } else if (filename.includes('payment')) {
        iconSymbol = `<rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="${iconColor}" stroke-width="2" fill="none"/>
                     <line x1="1" y1="10" x2="23" y2="10" stroke="${iconColor}" stroke-width="2"/>`;
      } else {
        iconSymbol = `<circle cx="12" cy="12" r="10" stroke="${iconColor}" stroke-width="2" fill="none"/>
                     <path d="M12 6v6l4 2" stroke="${iconColor}" stroke-width="2" fill="none"/>`;
      }
      
      svgContent = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <defs>
          <radialGradient id="iconBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#1a2f4a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0d1421;stop-opacity:1" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#iconBg)"/>
        <g transform="translate(256,256) scale(10,10) translate(-12,-12)">
          ${iconSymbol}
        </g>
      </svg>`;
    } else if (filename.includes('campaign')) {
      // Campaign placeholder
      svgContent = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="campaignGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f5c542;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0d1421;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#campaignGrad)"/>
        <circle cx="512" cy="300" r="100" fill="#fff" opacity="0.1"/>
        <rect x="200" y="600" width="624" height="80" rx="40" fill="#fff" opacity="0.2"/>
        <text x="512" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#fff" opacity="0.8">BONUS</text>
      </svg>`;
    } else if (filename.includes('favicon')) {
      // Favicon placeholder
      svgContent = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#0d1421"/>
        <circle cx="128" cy="128" r="80" fill="#f5c542"/>
        <text x="128" y="140" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#0d1421">P</text>
      </svg>`;
    } else {
      // Default placeholder
      svgContent = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a2f4a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0d1421;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#defaultGrad)"/>
        <circle cx="200" cy="150" r="60" fill="#f5c542" opacity="0.3"/>
        <text x="200" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#f5c542">Paribahis</text>
      </svg>`;
    }
    
    // Convert SVG to WebP using Sharp
    try {
      const webpBuffer = await sharp(Buffer.from(svgContent))
        .webp({ quality: 90 })
        .toBuffer();
      
      await fs.writeFile(filepath, webpBuffer);
      console.log(`📋 Created enhanced WebP placeholder: ${webpFilename}`);
    } catch (error) {
      // Fallback: create a simple colored rectangle with brand colors
      const fallbackBuffer = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 13, g: 20, b: 33 } // Dark blue brand color
        }
      })
      .webp({ quality: 90 })
      .toBuffer();
      
      await fs.writeFile(filepath, fallbackBuffer);
      console.log(`📋 Created brand-colored WebP placeholder: ${webpFilename}`);
    }
    
    return filepath;
  }

  /**
   * Add delay for rate limiting
   * @param {number} ms - Milliseconds to delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API key for image generation
   * @returns {Promise<boolean>} True if API key is valid
   */
  async validateApiKey() {
    try {
      const response = await this.client.models.list();
      console.log('✅ OpenAI API key is valid for image generation');
      return true;
    } catch (error) {
      console.error('❌ Invalid OpenAI API key for images:', error.message);
      return false;
    }
  }
}

module.exports = ImageGeneratorService;
