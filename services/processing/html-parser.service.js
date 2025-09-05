const BaseService = require('../base/base.service');
const cheerio = require('cheerio');
const { ValidationError } = require('../../src/utils/errors');

/**
 * HTML Parser Service
 * Analyzes and manipulates HTML content with production-ready architecture
 * Provides parsing, validation, optimization, and extraction capabilities
 */
class HTMLParserService extends BaseService {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      preserveWhitespace: false,
      validateHTML: true,
      extractMetadata: true,
      optimizeImages: true,
      ...config
    };

    this.parsingStats = {
      documentsProcessed: 0,
      elementsExtracted: 0,
      errorsFound: 0,
      optimizationsApplied: 0
    };
  }

  /**
   * Parse HTML content and extract structured data
   * @param {string} htmlContent - HTML content to parse
   * @param {object} options - Parsing options
   * @returns {Promise<object>} - Parsed HTML data
   */
  async parseHTML(htmlContent, options = {}) {
    this.logOperation('parseHTML', { 
      contentLength: htmlContent.length,
      validateHTML: options.validateHTML ?? this.config.validateHTML
    });

    const startTime = Date.now();

    try {
      // Load HTML with cheerio
      const $ = cheerio.load(htmlContent, {
        withDomLvl1: true,
        normalizeWhitespace: !this.config.preserveWhitespace,
        xmlMode: false,
        decodeEntities: true
      });

      // Validate HTML structure if enabled
      if (options.validateHTML ?? this.config.validateHTML) {
        this.validateHTMLStructure($);
      }

      // Extract structured data
      const parsedData = {
        metadata: this.extractMetadata($),
        structure: this.analyzeStructure($),
        images: this.extractImages($),
        links: this.extractLinks($),
        scripts: this.extractScripts($),
        styles: this.extractStyles($),
        content: this.extractContent($),
        performance: this.analyzePerformance($),
        seo: this.analyzeSEO($),
        accessibility: this.analyzeAccessibility($)
      };

      const duration = Date.now() - startTime;
      this.parsingStats.documentsProcessed++;

      this.logOperation('HTML parsing completed', { 
        duration,
        elementsFound: {
          images: parsedData.images.length,
          links: parsedData.links.length,
          scripts: parsedData.scripts.length,
          headings: parsedData.structure.headings.length
        }
      });

      return {
        success: true,
        data: parsedData,
        cheerio: $, // Return cheerio instance for further manipulation
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.parsingStats.errorsFound++;
      this.logError('HTML parsing failed', error, { duration });
      
      throw new ValidationError(`HTML parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract metadata from HTML document
   * @param {object} $ - Cheerio instance
   * @returns {object} - Extracted metadata
   */
  extractMetadata($) {
    this.logOperation('Extracting metadata');

    const metadata = {
      title: $('title').text() || '',
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      author: $('meta[name="author"]').attr('content') || '',
      viewport: $('meta[name="viewport"]').attr('content') || '',
      charset: $('meta[charset]').attr('charset') || '',
      robots: $('meta[name="robots"]').attr('content') || '',
      canonical: $('link[rel="canonical"]').attr('href') || '',
      openGraph: this.extractOpenGraph($),
      twitter: this.extractTwitterMeta($),
      structuredData: this.extractStructuredData($)
    };

    return metadata;
  }

  /**
   * Extract Open Graph metadata
   * @param {object} $ - Cheerio instance
   * @returns {object} - Open Graph data
   */
  extractOpenGraph($) {
    const og = {};
    
    $('meta[property^="og:"]').each((i, el) => {
      const property = $(el).attr('property').replace('og:', '');
      const content = $(el).attr('content');
      if (content) og[property] = content;
    });

    return og;
  }

  /**
   * Extract Twitter metadata
   * @param {object} $ - Cheerio instance
   * @returns {object} - Twitter meta data
   */
  extractTwitterMeta($) {
    const twitter = {};
    
    $('meta[name^="twitter:"]').each((i, el) => {
      const name = $(el).attr('name').replace('twitter:', '');
      const content = $(el).attr('content');
      if (content) twitter[name] = content;
    });

    return twitter;
  }

  /**
   * Extract structured data (JSON-LD)
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Structured data objects
   */
  extractStructuredData($) {
    const structuredData = [];
    
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const data = JSON.parse($(el).html());
        structuredData.push(data);
      } catch (error) {
        this.logError('Invalid JSON-LD', error, { index: i });
      }
    });

    return structuredData;
  }

  /**
   * Analyze HTML structure
   * @param {object} $ - Cheerio instance
   * @returns {object} - Structure analysis
   */
  analyzeStructure($) {
    this.logOperation('Analyzing HTML structure');

    const structure = {
      headings: this.extractHeadings($),
      navigation: this.extractNavigation($),
      sections: this.extractSections($),
      footer: this.extractFooter($),
      hierarchy: this.analyzeHeadingHierarchy($)
    };

    return structure;
  }

  /**
   * Extract headings with hierarchy
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Headings data
   */
  extractHeadings($) {
    const headings = [];
    
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      const $el = $(el);
      headings.push({
        level: parseInt(el.tagName.charAt(1)),
        text: $el.text().trim(),
        id: $el.attr('id') || '',
        classes: $el.attr('class') || ''
      });
    });

    return headings;
  }

  /**
   * Extract navigation elements
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Navigation data
   */
  extractNavigation($) {
    const navigation = [];
    
    $('nav').each((i, el) => {
      const $nav = $(el);
      const links = [];
      
      $nav.find('a').each((j, link) => {
        const $link = $(link);
        links.push({
          text: $link.text().trim(),
          href: $link.attr('href') || '',
          title: $link.attr('title') || ''
        });
      });
      
      navigation.push({
        type: 'nav',
        id: $nav.attr('id') || '',
        classes: $nav.attr('class') || '',
        links
      });
    });

    return navigation;
  }

  /**
   * Extract main content sections
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Sections data
   */
  extractSections($) {
    const sections = [];
    
    $('section, article, main').each((i, el) => {
      const $el = $(el);
      sections.push({
        tag: el.tagName,
        id: $el.attr('id') || '',
        classes: $el.attr('class') || '',
        contentLength: $el.text().trim().length,
        hasHeading: $el.find('h1, h2, h3, h4, h5, h6').length > 0
      });
    });

    return sections;
  }

  /**
   * Extract footer information
   * @param {object} $ - Cheerio instance
   * @returns {object} - Footer data
   */
  extractFooter($) {
    const $footer = $('footer');
    
    if ($footer.length === 0) {
      return { exists: false };
    }

    return {
      exists: true,
      contentLength: $footer.text().trim().length,
      links: $footer.find('a').length,
      hasContactInfo: /contact|email|phone|address/i.test($footer.text()),
      hasCopyright: /copyright|©|\(c\)/i.test($footer.text())
    };
  }

  /**
   * Analyze heading hierarchy for SEO
   * @param {object} $ - Cheerio instance
   * @returns {object} - Hierarchy analysis
   */
  analyzeHeadingHierarchy($) {
    const headings = this.extractHeadings($);
    const issues = [];
    
    // Check for multiple H1 tags
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      issues.push('Missing H1 tag');
    } else if (h1Count > 1) {
      issues.push('Multiple H1 tags found');
    }

    // Check for hierarchy skips
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      
      if (current.level > previous.level + 1) {
        issues.push(`Heading hierarchy skip: H${previous.level} to H${current.level}`);
      }
    }

    return {
      totalHeadings: headings.length,
      h1Count,
      issues,
      isValid: issues.length === 0
    };
  }

  /**
   * Extract images with analysis
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Images data
   */
  extractImages($) {
    const images = [];
    
    $('img').each((i, el) => {
      const $img = $(el);
      const src = $img.attr('src') || '';
      const alt = $img.attr('alt') || '';
      
      images.push({
        src,
        alt,
        title: $img.attr('title') || '',
        width: $img.attr('width') || '',
        height: $img.attr('height') || '',
        loading: $img.attr('loading') || '',
        hasAlt: !!alt,
        isDecorative: alt === '',
        srcset: $img.attr('srcset') || '',
        sizes: $img.attr('sizes') || ''
      });
    });

    this.parsingStats.elementsExtracted += images.length;
    return images;
  }

  /**
   * Extract links with analysis
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Links data
   */
  extractLinks($) {
    const links = [];
    
    $('a[href]').each((i, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      
      links.push({
        href,
        text: $link.text().trim(),
        title: $link.attr('title') || '',
        target: $link.attr('target') || '',
        rel: $link.attr('rel') || '',
        isExternal: href.startsWith('http') && !href.includes(location?.hostname || ''),
        isEmpty: !$link.text().trim(),
        hasTitle: !!$link.attr('title')
      });
    });

    return links;
  }

  /**
   * Extract scripts information
   * @param {object} $ - Cheerio instance
   * @returns {Array} - Scripts data
   */
  extractScripts($) {
    const scripts = [];
    
    $('script').each((i, el) => {
      const $script = $(el);
      const src = $script.attr('src');
      
      scripts.push({
        src: src || '',
        type: $script.attr('type') || 'text/javascript',
        async: $script.attr('async') !== undefined,
        defer: $script.attr('defer') !== undefined,
        isInline: !src,
        contentLength: src ? 0 : $script.html().length
      });
    });

    return scripts;
  }

  /**
   * Extract styles information
   * @param {object} $ - Cheerio instance
   * @returns {object} - Styles data
   */
  extractStyles($) {
    const externalStyles = [];
    const inlineStyles = [];
    
    $('link[rel="stylesheet"]').each((i, el) => {
      const $link = $(el);
      externalStyles.push({
        href: $link.attr('href') || '',
        media: $link.attr('media') || 'all'
      });
    });

    $('style').each((i, el) => {
      const $style = $(el);
      inlineStyles.push({
        type: $style.attr('type') || 'text/css',
        contentLength: $style.html().length
      });
    });

    return {
      external: externalStyles,
      inline: inlineStyles,
      totalExternal: externalStyles.length,
      totalInline: inlineStyles.length
    };
  }

  /**
   * Extract text content for analysis
   * @param {object} $ - Cheerio instance
   * @returns {object} - Content analysis
   */
  extractContent($) {
    const $body = $('body');
    const text = $body.text();
    
    return {
      totalLength: text.length,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      paragraphs: $('p').length,
      readabilityScore: this.calculateReadabilityScore(text)
    };
  }

  /**
   * Calculate simple readability score
   * @param {string} text - Text to analyze
   * @returns {number} - Readability score (0-100)
   */
  calculateReadabilityScore(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(word => word.length > 0).length;
    
    if (sentences === 0 || words === 0) return 0;
    
    const avgWordsPerSentence = words / sentences;
    const score = Math.max(0, Math.min(100, 100 - (avgWordsPerSentence - 15) * 2));
    
    return Math.round(score);
  }

  /**
   * Analyze performance aspects
   * @param {object} $ - Cheerio instance
   * @returns {object} - Performance analysis
   */
  analyzePerformance($) {
    const images = this.extractImages($);
    const scripts = this.extractScripts($);
    const styles = this.extractStyles($);
    
    const issues = [];
    
    // Check for images without dimensions
    const imagesWithoutDimensions = images.filter(img => !img.width || !img.height).length;
    if (imagesWithoutDimensions > 0) {
      issues.push(`${imagesWithoutDimensions} images without dimensions`);
    }

    // Check for blocking scripts
    const blockingScripts = scripts.filter(script => script.src && !script.async && !script.defer).length;
    if (blockingScripts > 0) {
      issues.push(`${blockingScripts} blocking scripts`);
    }

    return {
      issues,
      score: Math.max(0, 100 - (issues.length * 10)),
      totalResources: images.length + scripts.length + styles.totalExternal
    };
  }

  /**
   * Analyze SEO aspects
   * @param {object} $ - Cheerio instance
   * @returns {object} - SEO analysis
   */
  analyzeSEO($) {
    const metadata = this.extractMetadata($);
    const hierarchy = this.analyzeHeadingHierarchy($);
    const images = this.extractImages($);
    
    const issues = [];
    
    if (!metadata.title) issues.push('Missing page title');
    if (!metadata.description) issues.push('Missing meta description');
    if (!hierarchy.isValid) issues.push('Invalid heading hierarchy');
    
    const imagesWithoutAlt = images.filter(img => !img.hasAlt).length;
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images without alt text`);
    }

    return {
      issues,
      score: Math.max(0, 100 - (issues.length * 15)),
      hasStructuredData: metadata.structuredData.length > 0
    };
  }

  /**
   * Analyze accessibility aspects
   * @param {object} $ - Cheerio instance
   * @returns {object} - Accessibility analysis
   */
  analyzeAccessibility($) {
    const images = this.extractImages($);
    const links = this.extractLinks($);
    
    const issues = [];
    
    // Check for images without alt text
    const imagesWithoutAlt = images.filter(img => !img.hasAlt && !img.isDecorative).length;
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images missing alt text`);
    }

    // Check for empty links
    const emptyLinks = links.filter(link => link.isEmpty).length;
    if (emptyLinks > 0) {
      issues.push(`${emptyLinks} empty links`);
    }

    // Check for missing language attribute
    if (!$('html').attr('lang')) {
      issues.push('Missing language attribute on html element');
    }

    return {
      issues,
      score: Math.max(0, 100 - (issues.length * 12)),
      level: issues.length === 0 ? 'AA' : issues.length <= 2 ? 'A' : 'Below standards'
    };
  }

  /**
   * Validate HTML structure
   * @param {object} $ - Cheerio instance
   * @throws {ValidationError} - If HTML structure is invalid
   */
  validateHTMLStructure($) {
    const errors = [];
    
    // Check for required elements
    if ($('html').length === 0) errors.push('Missing <html> element');
    if ($('head').length === 0) errors.push('Missing <head> element');
    if ($('body').length === 0) errors.push('Missing <body> element');
    if ($('title').length === 0) errors.push('Missing <title> element');
    
    // Check for duplicate IDs
    const ids = {};
    $('[id]').each((i, el) => {
      const id = $(el).attr('id');
      if (ids[id]) {
        errors.push(`Duplicate ID: ${id}`);
      } else {
        ids[id] = true;
      }
    });

    if (errors.length > 0) {
      this.parsingStats.errorsFound += errors.length;
      throw new ValidationError(`HTML validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Get parsing statistics
   * @returns {object} - Current parsing statistics
   */
  getParsingStats() {
    return { ...this.parsingStats };
  }

  /**
   * Reset parsing statistics
   */
  resetStats() {
    this.parsingStats = {
      documentsProcessed: 0,
      elementsExtracted: 0,
      errorsFound: 0,
      optimizationsApplied: 0
    };
    
    this.logOperation('Parsing statistics reset');
  }
}

module.exports = HTMLParserService;
