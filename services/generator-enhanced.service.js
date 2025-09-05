const HTMLGeneratorService = require('./html-generator.service');
const ImageGeneratorService = require('./image-generator.service');
const ImagePromptGeneratorService = require('./image-prompt-generator.service');
const HTMLCombinerService = require('./processing/html-combiner.service');
const StructureGeneratorService = require('./structure-generator.service');
const { getConfig, validateConfig } = require('../config/openai.config');
const fs = require('fs').promises;
const path = require('path');

class SiteGeneratorService {
  constructor(apiKey) {
    this.config = getConfig();
    this.htmlGenerator = new HTMLGeneratorService(apiKey || this.config.openai.apiKey);
    this.imageGenerator = new ImageGeneratorService(apiKey || this.config.openai.apiKey);
    this.imagePromptGenerator = new ImagePromptGeneratorService(apiKey || this.config.openai.apiKey);
    this.htmlCombiner = new HTMLCombinerService();
  }

  /**
   * Generate complete gambling site with enhanced AI-powered workflow
   * @param {Object} params - Generation parameters
   * @param {string} params.primaryKeyword - Primary SEO keyword
   * @param {string} params.canonicalUrl - Canonical URL
   * @param {Object} params.hreflangUrls - Hreflang URLs object
   * @param {Array<string>} params.secondaryKeywords - Secondary keywords
   * @param {Array<string>} params.focusAreas - Focus areas
   * @param {string} params.brandName - Brand/site name
   * @returns {Promise<Object>} Generation result
   */
  async generateSite(params) {
    try {
      console.log('🚀 Starting advanced AI-powered site generation workflow...');
      
      // Validate configuration
      const configValidation = validateConfig();
      if (!configValidation.isValid) {
        throw new Error(`Configuration errors: ${configValidation.errors.join(', ')}`);
      }

      // Validate input parameters
      this.validateInputParams(params);

      // Create output directory structure
      const outputDir = await this.createOutputDirectory(params.primaryKeyword);
      console.log(`📁 Output directory: ${outputDir}`);

      // STEP 1: Generate HTML content first
      console.log('📝 Step 1: Generating HTML content with GPT-5...');
      const htmlContent = await this.htmlGenerator.generateHTML({
        ...params,
        outputDir
      });

      // STEP 2: Parse HTML to find image references
      console.log('🔍 Step 2: Parsing HTML for image references...');
      const imageReferences = this.htmlGenerator.parseImageReferences(htmlContent);
      
      if (imageReferences.length === 0) {
        console.log('ℹ️  No image references found in HTML');
      } else {
        console.log(`🖼️  Found ${imageReferences.length} image references to generate`);
      }

      // STEP 3: Generate AI-powered contextual prompts by analyzing HTML
      console.log('🤖 Step 3: Generating contextual image prompts with AI...');
      const enhancedImageReferences = await this.imagePromptGenerator.generateContextualPrompts(
        htmlContent,
        imageReferences,
        params.primaryKeyword
      );

      // STEP 4: Generate images using AI-generated prompts with GPT-Image-1
      console.log('🎨 Step 4: Generating images with AI prompts using GPT-Image-1...');
      const generatedImages = await this.imageGenerator.generateImagesFromEnhancedReferences(
        enhancedImageReferences,
        {
          primaryKeyword: params.primaryKeyword,
          outputDir
        }
      );

      // STEP 5: Combine HTML with embedded images (self-contained file)
      console.log('📦 Step 5: Creating self-contained HTML with embedded images...');
      const combinedResult = await this.htmlCombiner.createSelfContainedHTML(
        htmlContent,
        generatedImages,
        outputDir,
        'index.html'
      );

      // STEP 6: Generate additional files
      console.log('📄 Step 6: Generating additional files...');
      await this.generateAdditionalFiles(outputDir, params);

      // STEP 7: Generate summary report
      const report = this.generateReport(params, generatedImages, outputDir, combinedResult);

      console.log('🎉 Advanced AI-powered site generation workflow completed successfully!');
      console.log(`📊 Generated ${generatedImages.length} images with AI-contextual prompts`);
      console.log(`📦 Self-contained file size: ${combinedResult.formattedSize}`);
      console.log(`📂 Output location: ${outputDir}`);

      return {
        success: true,
        outputDir,
        htmlFile: combinedResult.filepath,
        combinedHTML: combinedResult,
        images: generatedImages,
        enhancedImageReferences: enhancedImageReferences,
        report,
        workflow: 'GPT-5 HTML → Parse → GPT-5 Contextual Prompts → GPT-Image-1 → Self-contained HTML',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Advanced site generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate input parameters
   * @param {Object} params - Input parameters to validate
   */
  validateInputParams(params) {
    const required = ['primaryKeyword', 'canonicalUrl'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }

    // Validate URL format
    try {
      new URL(params.canonicalUrl);
    } catch {
      throw new Error('Invalid canonical URL format');
    }

    // Validate primary keyword
    if (params.primaryKeyword.length < 2) {
      throw new Error('Primary keyword must be at least 2 characters long');
    }
  }

  /**
   * Create output directory structure
   * @param {string} primaryKeyword - Primary keyword for directory naming
   * @returns {Promise<string>} Output directory path
   */
  async createOutputDirectory(primaryKeyword) {
    const sanitizedKeyword = primaryKeyword.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = new Date().toISOString().slice(0, 10);
    const outputDir = path.join(process.cwd(), 'output', `${sanitizedKeyword}-${timestamp}`);

    // Create directory structure
    const directories = [
      outputDir,
      path.join(outputDir, 'assets'),
      path.join(outputDir, 'assets', 'images'),
      path.join(outputDir, 'assets', 'css'),
      path.join(outputDir, 'assets', 'js')
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    return outputDir;
  }

  /**
   * Generate additional files (robots.txt, sitemap.xml, etc.)
   * @param {string} outputDir - Output directory path
   * @param {Object} params - Generation parameters
   */
  async generateAdditionalFiles(outputDir, params) {
    // Generate robots.txt
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${params.canonicalUrl}/sitemap.xml`;

    await fs.writeFile(path.join(outputDir, 'robots.txt'), robotsTxt);

    // Generate sitemap.xml with hreflang support
    let hreflangEntries = '';
    if (params.hreflangUrls && Object.keys(params.hreflangUrls).length > 0) {
      hreflangEntries = Object.entries(params.hreflangUrls)
        .map(([lang, url]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${url}" />`)
        .join('\n');
    }

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${params.canonicalUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
${hreflangEntries}
  </url>
</urlset>`;

    await fs.writeFile(path.join(outputDir, 'sitemap.xml'), sitemapXml);

    // Generate manifest.json for PWA support
    const manifest = {
      name: params.brandName || params.primaryKeyword,
      short_name: params.primaryKeyword,
      description: `${params.primaryKeyword} - Güvenilir bahis platformu`,
      start_url: "/",
      display: "standalone",
      background_color: "#0d1421",
      theme_color: "#f5c542",
      icons: [
        {
          src: "assets/images/favicon-" + params.primaryKeyword.toLowerCase().replace(/[^a-z0-9]/g, '-') + ".webp",
          sizes: "192x192",
          type: "image/webp"
        }
      ]
    };

    await fs.writeFile(
      path.join(outputDir, 'manifest.json'), 
      JSON.stringify(manifest, null, 2)
    );

    console.log('📄 Generated additional files: robots.txt, sitemap.xml, manifest.json');
  }

  /**
   * Generate summary report for enhanced workflow
   * @param {Object} params - Generation parameters
   * @param {Array} images - Generated images
   * @param {string} outputDir - Output directory
   * @param {Object} combinedResult - Self-contained HTML result
   * @returns {Object} Generation report
   */
  generateReport(params, images, outputDir, combinedResult) {
    return {
      workflow: {
        type: 'Advanced AI-Powered: GPT-5 HTML → Parse → GPT-5 Contextual Prompts → GPT-Image-1 → Self-contained',
        steps: [
          'Generate HTML with GPT-5',
          'Parse image references from HTML',
          'Analyze HTML context with GPT-5 to generate image prompts',
          'Generate contextual images with GPT-Image-1',
          'Embed images as base64 in HTML',
          'Create self-contained file'
        ]
      },
      project: {
        primaryKeyword: params.primaryKeyword,
        canonicalUrl: params.canonicalUrl,
        hreflangUrls: params.hreflangUrls || {},
        secondaryKeywords: params.secondaryKeywords || [],
        focusAreas: params.focusAreas || []
      },
      files: {
        selfContainedHTML: 'index.html',
        size: combinedResult.formattedSize,
        embeddedImages: combinedResult.embeddedImages,
        additional: ['robots.txt', 'sitemap.xml', 'manifest.json']
      },
      images: {
        total: images.length,
        model: 'GPT-Image-1',
        format: 'WebP (Base64 embedded)',
        generated: images.filter(img => !img.isPlaceholder).length,
        placeholders: images.filter(img => img.isPlaceholder).length,
        aiContextualPrompts: images.filter(img => img.aiGenerated).length
      },
      statistics: {
        totalImages: images.length,
        totalFiles: 4, // HTML + 3 additional files (images are embedded)
        outputDirectory: outputDir,
        selfContained: true,
        aiEnhanced: true
      },
      seo: {
        language: 'tr',
        compliance: 'YMYL gambling standards',
        structured_data: ['FAQ', 'BreadcrumbList', 'Organization'],
        meta_tags: 'Complete SEO meta tags included',
        hreflang: Object.keys(params.hreflangUrls || {}).length > 0
      },
      deployment: {
        ready: true,
        requirements: 'Single HTML file deployment - no server dependencies',
        notes: 'Self-contained file with AI-contextual images embedded as base64',
        advantages: [
          'No external dependencies',
          'Fast loading (single request)',
          'Easy deployment anywhere',
          'Offline capable',
          'AI-contextual images matching content'
        ]
      }
    };
  }

  /**
   * Get generation status and validate setup for enhanced workflow
   * @returns {Promise<Object>} Status information
   */
  async getStatus() {
    try {
      const configValidation = validateConfig();
      const htmlApiValid = await this.htmlGenerator.validateApiKey();
      const imageApiValid = await this.imageGenerator.validateApiKey();
      const promptApiValid = await this.imagePromptGenerator.validateApiKey();

      const status = {
        workflow: 'Advanced AI: GPT-5 HTML → Parse → GPT-5 Contextual Prompts → GPT-Image-1 → Self-contained',
        configuration: configValidation,
        services: {
          htmlGenerator: {
            valid: htmlApiValid,
            model: 'gpt-5-2025-08-07'
          },
          imageGenerator: {
            valid: imageApiValid,
            model: 'gpt-image-1'
          },
          imagePromptGenerator: {
            valid: promptApiValid,
            model: 'gpt-5-2025-08-07',
            feature: 'Contextual prompt analysis'
          },
          htmlCombiner: {
            ready: true,
            features: ['Base64 embedding', 'WebP support', 'Self-contained output']
          }
        },
        apiKey: {
          valid: htmlApiValid && imageApiValid && promptApiValid,
          set: !!this.config.openai.apiKey
        },
        ready: configValidation.isValid && htmlApiValid && imageApiValid && promptApiValid
      };

      return status;
    } catch (error) {
      return {
        error: error.message,
        ready: false
      };
    }
  }
}

module.exports = SiteGeneratorService;
