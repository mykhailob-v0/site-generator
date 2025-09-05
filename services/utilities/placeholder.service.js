const BaseService = require('../base/base.service');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Placeholder Service
 * Generates placeholder content and images for development and testing
 * Provides fallback content when real content is not available
 */
class PlaceholderService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      placeholderAPI: 'https://picsum.photos',
      textAPI: 'https://jsonplaceholder.typicode.com',
      fallbackImages: true,
      fallbackText: true,
      imageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      ...config
    };

    this.placeholderCache = new Map();
    this.textTemplates = this.initializeTextTemplates();
  }

  /**
   * Initialize text templates for different content types
   * @returns {object} - Text templates
   */
  initializeTextTemplates() {
    return {
      headlines: [
        'Welcome to Our Amazing Website',
        'Discover Something Extraordinary',
        'Your Journey Starts Here',
        'Excellence in Every Detail',
        'Innovation Meets Design',
        'Crafting Digital Experiences',
        'Building Tomorrow Today',
        'Where Ideas Come to Life'
      ],
      paragraphs: [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
        'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
        'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus.'
      ],
      shortText: [
        'Professional services for modern businesses',
        'Quality solutions that deliver results',
        'Innovative approaches to complex challenges',
        'Trusted expertise you can rely on',
        'Excellence in service and support',
        'Your success is our priority',
        'Building lasting partnerships',
        'Committed to your growth'
      ],
      businessTypes: [
        'Technology Solutions',
        'Digital Marketing',
        'Consulting Services',
        'Creative Agency',
        'Professional Services',
        'E-commerce Platform',
        'Financial Advisory',
        'Educational Resources'
      ],
      features: [
        'Fast and Reliable',
        'User-Friendly Interface',
        '24/7 Customer Support',
        'Secure and Private',
        'Mobile Responsive',
        'Easy Integration',
        'Scalable Solution',
        'Expert Team'
      ],
      callToActions: [
        'Get Started Today',
        'Learn More',
        'Contact Us Now',
        'Try It Free',
        'Schedule Demo',
        'Download Now',
        'Sign Up',
        'Request Quote'
      ]
    };
  }

  /**
   * Generate placeholder image
   * @param {object} options - Image options
   * @returns {Promise<object>} - Image information
   */
  async generatePlaceholderImage(options = {}) {
    const {
      width = 800,
      height = 600,
      category = 'nature',
      format = 'jpg',
      blur = false,
      grayscale = false,
      seed = null
    } = options;

    this.logOperation('Generating placeholder image', { width, height, category, format });

    try {
      // Check cache first
      const cacheKey = `image_${width}x${height}_${category}_${format}_${blur}_${grayscale}_${seed}`;
      if (this.placeholderCache.has(cacheKey)) {
        this.logOperation('Using cached placeholder image', { cacheKey });
        return this.placeholderCache.get(cacheKey);
      }

      let imageUrl;
      let filename;

      // Generate URL based on service
      if (seed) {
        imageUrl = `${this.config.placeholderAPI}/${width}/${height}?random=${seed}`;
        filename = `placeholder_${width}x${height}_${seed}.${format}`;
      } else {
        const timestamp = Date.now();
        imageUrl = `${this.config.placeholderAPI}/${width}/${height}?random=${timestamp}`;
        filename = `placeholder_${width}x${height}_${timestamp}.${format}`;
      }

      // Add filters
      const filters = [];
      if (blur) filters.push('blur');
      if (grayscale) filters.push('grayscale');
      
      if (filters.length > 0) {
        imageUrl += `&${filters.join('&')}`;
      }

      const imageInfo = {
        url: imageUrl,
        filename,
        width,
        height,
        format,
        category,
        alt: this.generateImageAltText(category, width, height),
        title: this.generateImageTitle(category),
        description: this.generateImageDescription(category)
      };

      // Cache the result
      this.placeholderCache.set(cacheKey, imageInfo);

      this.logOperation('Placeholder image generated', { 
        url: imageUrl, 
        filename,
        cached: true 
      });

      return imageInfo;

    } catch (error) {
      this.logError('Failed to generate placeholder image', error, options);
      
      // Return fallback image info
      return this.getFallbackImageInfo(width, height, format);
    }
  }

  /**
   * Generate multiple placeholder images
   * @param {Array} imageSpecs - Array of image specifications
   * @returns {Promise<Array>} - Array of image information
   */
  async generatePlaceholderImages(imageSpecs) {
    this.logOperation('Generating multiple placeholder images', { 
      count: imageSpecs.length 
    });

    const results = await Promise.allSettled(
      imageSpecs.map(spec => this.generatePlaceholderImage(spec))
    );

    const images = results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    const failures = results.filter(result => result.status === 'rejected').length;

    this.logOperation('Multiple placeholder images generated', { 
      successful: images.length, 
      failed: failures 
    });

    return images;
  }

  /**
   * Generate placeholder text content
   * @param {object} options - Text options
   * @returns {object} - Generated text content
   */
  generatePlaceholderText(options = {}) {
    const {
      type = 'paragraph',
      wordCount = null,
      sentenceCount = null,
      includeMarkdown = false,
      businessTheme = null
    } = options;

    this.logOperation('Generating placeholder text', { type, wordCount, sentenceCount });

    try {
      let content = '';

      switch (type) {
        case 'headline':
        case 'title':
          content = this.getRandomTemplate('headlines');
          if (businessTheme) {
            content = content.replace('Website', businessTheme);
          }
          break;

        case 'paragraph':
          content = this.generateParagraphText(wordCount, sentenceCount);
          break;

        case 'short':
        case 'description':
          content = this.getRandomTemplate('shortText');
          break;

        case 'feature':
          content = this.getRandomTemplate('features');
          break;

        case 'cta':
        case 'button':
          content = this.getRandomTemplate('callToActions');
          break;

        case 'business':
          content = this.getRandomTemplate('businessTypes');
          break;

        case 'list':
          content = this.generateListText(options.itemCount || 5);
          break;

        case 'article':
          content = this.generateArticleText(options.paragraphCount || 3);
          break;

        default:
          content = this.getRandomTemplate('paragraphs');
      }

      // Apply markdown formatting if requested
      if (includeMarkdown) {
        content = this.applyMarkdownFormatting(content, type);
      }

      // Apply word count limit if specified
      if (wordCount && type !== 'headline' && type !== 'cta') {
        content = this.limitWordCount(content, wordCount);
      }

      const result = {
        content,
        type,
        wordCount: this.countWords(content),
        characterCount: content.length,
        generated: new Date().toISOString()
      };

      this.logOperation('Placeholder text generated', { 
        type, 
        wordCount: result.wordCount,
        characterCount: result.characterCount
      });

      return result;

    } catch (error) {
      this.logError('Failed to generate placeholder text', error, options);
      
      return {
        content: 'Placeholder text content',
        type,
        wordCount: 3,
        characterCount: 24,
        generated: new Date().toISOString(),
        error: true
      };
    }
  }

  /**
   * Generate complete page content with placeholders
   * @param {object} structure - Page structure
   * @returns {object} - Complete page content
   */
  generatePageContent(structure) {
    this.logOperation('Generating complete page content', { structure: structure.type });

    const content = {
      title: this.generatePlaceholderText({ type: 'headline' }).content,
      description: this.generatePlaceholderText({ type: 'description' }).content,
      sections: [],
      images: [],
      navigation: [],
      footer: {}
    };

    // Generate sections based on structure
    if (structure.sections) {
      content.sections = structure.sections.map(section => ({
        id: section.id || `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: section.type,
        title: this.generatePlaceholderText({ type: 'headline' }).content,
        content: section.type === 'hero' 
          ? this.generatePlaceholderText({ type: 'short' }).content
          : this.generatePlaceholderText({ type: 'paragraph' }).content,
        image: section.needsImage ? {
          url: `${this.config.placeholderAPI}/800/400`,
          alt: this.generateImageAltText('business', 800, 400)
        } : null,
        cta: section.needsCTA ? {
          text: this.generatePlaceholderText({ type: 'cta' }).content,
          url: '#'
        } : null
      }));
    }

    // Generate navigation
    content.navigation = [
      { text: 'Home', url: '#home' },
      { text: 'About', url: '#about' },
      { text: 'Services', url: '#services' },
      { text: 'Contact', url: '#contact' }
    ];

    // Generate footer content
    content.footer = {
      copyright: `© ${new Date().getFullYear()} ${this.generatePlaceholderText({ type: 'business' }).content}`,
      links: [
        { text: 'Privacy Policy', url: '#privacy' },
        { text: 'Terms of Service', url: '#terms' },
        { text: 'Contact Us', url: '#contact' }
      ]
    };

    this.logOperation('Page content generated', { 
      sectionsCount: content.sections.length,
      navigationItems: content.navigation.length
    });

    return content;
  }

  /**
   * Generate business-specific content
   * @param {string} businessType - Type of business
   * @returns {object} - Business-specific content
   */
  generateBusinessContent(businessType) {
    this.logOperation('Generating business-specific content', { businessType });

    const businessTemplates = {
      'restaurant': {
        headlines: ['Delicious Cuisine Awaits', 'Fresh Ingredients, Amazing Flavors'],
        descriptions: ['Experience culinary excellence with our chef-crafted dishes'],
        features: ['Farm-to-Table Ingredients', 'Award-Winning Chef', 'Cozy Atmosphere']
      },
      'agency': {
        headlines: ['Creative Solutions for Your Brand', 'Digital Excellence Delivered'],
        descriptions: ['We help businesses grow through innovative digital strategies'],
        features: ['Expert Team', 'Proven Results', 'Custom Solutions']
      },
      'ecommerce': {
        headlines: ['Shop the Latest Trends', 'Quality Products, Great Prices'],
        descriptions: ['Discover amazing products with fast shipping and easy returns'],
        features: ['Free Shipping', 'Easy Returns', 'Secure Checkout']
      },
      'saas': {
        headlines: ['Streamline Your Workflow', 'Powerful Tools for Modern Teams'],
        descriptions: ['Boost productivity with our comprehensive software solution'],
        features: ['Cloud-Based', 'Real-time Collaboration', '24/7 Support']
      }
    };

    const templates = businessTemplates[businessType] || businessTemplates['agency'];

    return {
      businessType,
      headline: this.getRandomItem(templates.headlines),
      description: this.getRandomItem(templates.descriptions),
      features: templates.features,
      cta: 'Get Started Today'
    };
  }

  /**
   * Save placeholder image to file
   * @param {object} imageInfo - Image information
   * @param {string} outputPath - Output directory path
   * @returns {Promise<string>} - Saved file path
   */
  async savePlaceholderImage(imageInfo, outputPath) {
    this.logOperation('Saving placeholder image', { 
      filename: imageInfo.filename, 
      outputPath 
    });

    try {
      // Ensure output directory exists
      await fs.promises.mkdir(outputPath, { recursive: true });

      const filePath = path.join(outputPath, imageInfo.filename);

      // For now, create a simple text file with image info
      // In a real implementation, you would fetch and save the actual image
      const imageData = JSON.stringify({
        ...imageInfo,
        localPath: filePath,
        savedAt: new Date().toISOString()
      }, null, 2);

      await fs.promises.writeFile(filePath + '.json', imageData);

      this.logOperation('Placeholder image saved', { filePath });

      return filePath;

    } catch (error) {
      this.logError('Failed to save placeholder image', error, { 
        filename: imageInfo.filename, 
        outputPath 
      });
      throw error;
    }
  }

  // Helper methods

  /**
   * Get random template from category
   * @param {string} category - Template category
   * @returns {string} - Random template
   */
  getRandomTemplate(category) {
    const templates = this.textTemplates[category] || this.textTemplates.paragraphs;
    return this.getRandomItem(templates);
  }

  /**
   * Get random item from array
   * @param {Array} array - Array to choose from
   * @returns {any} - Random item
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate paragraph text with specific constraints
   * @param {number} wordCount - Target word count
   * @param {number} sentenceCount - Target sentence count
   * @returns {string} - Generated paragraph
   */
  generateParagraphText(wordCount, sentenceCount) {
    if (sentenceCount) {
      const sentences = [];
      for (let i = 0; i < sentenceCount; i++) {
        sentences.push(this.getRandomTemplate('paragraphs').split('.')[0] + '.');
      }
      return sentences.join(' ');
    }

    let text = this.getRandomTemplate('paragraphs');
    
    if (wordCount) {
      text = this.limitWordCount(text, wordCount);
    }

    return text;
  }

  /**
   * Generate list text
   * @param {number} itemCount - Number of list items
   * @returns {string} - Generated list
   */
  generateListText(itemCount) {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(this.getRandomTemplate('features'));
    }
    return items.join('\n• ');
  }

  /**
   * Generate article text
   * @param {number} paragraphCount - Number of paragraphs
   * @returns {string} - Generated article
   */
  generateArticleText(paragraphCount) {
    const paragraphs = [];
    for (let i = 0; i < paragraphCount; i++) {
      paragraphs.push(this.getRandomTemplate('paragraphs'));
    }
    return paragraphs.join('\n\n');
  }

  /**
   * Apply markdown formatting
   * @param {string} content - Content to format
   * @param {string} type - Content type
   * @returns {string} - Formatted content
   */
  applyMarkdownFormatting(content, type) {
    switch (type) {
      case 'headline':
        return `# ${content}`;
      case 'title':
        return `## ${content}`;
      case 'paragraph':
        return content;
      case 'list':
        return content.split('\n').map(item => `- ${item}`).join('\n');
      default:
        return content;
    }
  }

  /**
   * Limit word count of text
   * @param {string} text - Text to limit
   * @param {number} maxWords - Maximum words
   * @returns {string} - Limited text
   */
  limitWordCount(text, maxWords) {
    const words = text.split(' ');
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  }

  /**
   * Count words in text
   * @param {string} text - Text to count
   * @returns {number} - Word count
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Generate image alt text
   * @param {string} category - Image category
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {string} - Alt text
   */
  generateImageAltText(category, width, height) {
    const altTexts = {
      nature: 'Beautiful nature landscape',
      business: 'Professional business environment',
      technology: 'Modern technology solution',
      people: 'Professional team members',
      abstract: 'Creative abstract design'
    };

    const baseText = altTexts[category] || 'Placeholder image';
    return `${baseText} (${width}x${height})`;
  }

  /**
   * Generate image title
   * @param {string} category - Image category
   * @returns {string} - Image title
   */
  generateImageTitle(category) {
    const titles = {
      nature: 'Scenic View',
      business: 'Professional Setting',
      technology: 'Innovation',
      people: 'Our Team',
      abstract: 'Creative Design'
    };

    return titles[category] || 'Image';
  }

  /**
   * Generate image description
   * @param {string} category - Image category
   * @returns {string} - Image description
   */
  generateImageDescription(category) {
    const descriptions = {
      nature: 'A beautiful natural landscape showcasing the beauty of our environment',
      business: 'Professional business environment representing quality and excellence',
      technology: 'Cutting-edge technology solutions for modern challenges',
      people: 'Our dedicated team of professionals ready to serve you',
      abstract: 'Creative and inspiring design elements'
    };

    return descriptions[category] || 'High-quality placeholder image';
  }

  /**
   * Get fallback image info when generation fails
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {string} format - Image format
   * @returns {object} - Fallback image info
   */
  getFallbackImageInfo(width, height, format) {
    return {
      url: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">${width}×${height}</text></svg>`,
      filename: `fallback_${width}x${height}.svg`,
      width,
      height,
      format: 'svg',
      category: 'fallback',
      alt: `Fallback placeholder image ${width}x${height}`,
      title: 'Placeholder Image',
      description: 'Generated fallback placeholder image',
      isFallback: true
    };
  }

  /**
   * Clear placeholder cache
   */
  clearCache() {
    const cacheSize = this.placeholderCache.size;
    this.placeholderCache.clear();
    
    this.logOperation('Placeholder cache cleared', { clearedItems: cacheSize });
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getCacheStats() {
    return {
      size: this.placeholderCache.size,
      keys: Array.from(this.placeholderCache.keys())
    };
  }
}

module.exports = PlaceholderService;
