const HTMLGeneratorService = require('./html-generator.service');
const ImageGeneratorService = require('./image-generator.service');
const ImagePromptGeneratorService = require('./image-prompt-generator.service');
const HTMLCombinerService = require('./html-combiner.service');
const StructureGeneratorService = require('./structure-generator.service');
const { getConfig, validateConfig } = require('../config/openai.config');
const fs = require('fs').promises;
const path = require('path');

class SiteGeneratorService {
  constructor(apiKey) {
    this.config = getConfig();
    this.structureGenerator = new StructureGeneratorService(apiKey || this.config.openai.apiKey);
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
      console.log('🚀 Starting enhanced AI-powered site generation workflow...');
      
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

      // STEP 0: Generate dynamic structure plan
      console.log('📐 Step 0: Generating dynamic HTML structure plan...');
      const structureResult = await this.structureGenerator.generateStructure(params);
      const structurePlan = structureResult.structurePlan;

      // STEP 1: Generate HTML content with dynamic structure
      console.log('📝 Step 1: Generating HTML content with GPT-5 using dynamic structure...');
      const htmlContent = await this.htmlGenerator.generateHTML({
        ...params,
        outputDir,
        structurePlan // Pass the structure plan to HTML generator
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
      const report = this.generateReport(params, generatedImages, outputDir, combinedResult, structurePlan);

      console.log('🎉 Enhanced AI-powered site generation workflow completed successfully!');
      console.log(`� Structure Plan: ${structurePlan.structure.sections.length} dynamic sections`);
      console.log(`�📊 Generated ${generatedImages.length} images with AI-contextual prompts`);
      console.log(`📦 Self-contained file size: ${combinedResult.formattedSize}`);
      console.log(`📂 Output location: ${outputDir}`);

      return {
        success: true,
        outputDir,
        htmlFile: combinedResult.filepath,
        combinedHTML: combinedResult,
        images: generatedImages,
        enhancedImageReferences: enhancedImageReferences,
        structurePlan,
        report,
        workflow: 'GPT-5 Structure → GPT-5 HTML → Parse → GPT-5 Contextual Prompts → GPT-Image-1 → Self-contained HTML',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Enhanced site generation failed:', error.message);
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
   * @param {Object} structurePlan - Dynamic structure plan
   * @returns {Object} Generation report
   */
  generateReport(params, images, outputDir, combinedResult, structurePlan) {
    return {
      workflow: {
        type: 'Enhanced AI-Powered: GPT-5 Structure → GPT-5 HTML → Parse → GPT-5 Contextual Prompts → GPT-Image-1 → Self-contained',
        steps: [
          'Generate dynamic structure plan with GPT-5',
          'Generate HTML with GPT-5 using structure plan',
          'Parse image references from HTML',
          'Analyze HTML context with GPT-5 to generate image prompts',
          'Generate contextual images with GPT-Image-1',
          'Embed images as base64 in HTML',
          'Create self-contained file'
        ]
      },
      structure: {
        dynamic: true,
        sections: structurePlan.structure.sections.length,
        features: structurePlan.structure.features.count,
        campaigns: structurePlan.structure.campaigns.count,
        faq: structurePlan.structure.faq.count,
        unique_elements: structurePlan.unique_elements || [],
        primary_focus: structurePlan.structure.content_emphasis?.primary_focus || 'general'
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
        aiEnhanced: true,
        dynamicStructure: true
      },
      seo: {
        language: 'tr',
        compliance: 'YMYL gambling standards',
        structured_data: ['FAQ', 'BreadcrumbList', 'Organization'],
        meta_tags: 'Complete SEO meta tags included',
        hreflang: Object.keys(params.hreflangUrls || {}).length > 0,
        dynamic_optimization: structurePlan.seo_strategy
      },
      deployment: {
        ready: true,
        requirements: 'Single HTML file deployment - no server dependencies',
        notes: 'Self-contained file with AI-contextual images and dynamic structure',
        advantages: [
          'No external dependencies',
          'Fast loading (single request)',
          'Easy deployment anywhere',
          'Offline capable',
          'AI-contextual images matching content',
          'Dynamic structure based on business focus',
          'Unique layout for each generation'
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
      const structureApiValid = await this.structureGenerator.validateApiKey();
      const htmlApiValid = await this.htmlGenerator.validateApiKey();
      const imageApiValid = await this.imageGenerator.validateApiKey();
      const promptApiValid = await this.imagePromptGenerator.validateApiKey();

      const status = {
        workflow: 'Enhanced AI: GPT-5 Structure → GPT-5 HTML → Parse → GPT-5 Contextual Prompts → GPT-Image-1 → Self-contained',
        configuration: configValidation,
        services: {
          1: {
            name: 'Structure Generator Service',
            file: 'structure-generator.service.js',
            valid: structureApiValid,
            model: 'gpt-5-2025-08-07',
            purpose: 'Generate dynamic HTML structure plans based on business requirements'
          },
          2: {
            name: 'HTML Generator Service',
            file: 'html-generator.service.js',
            valid: htmlApiValid,
            model: 'gpt-5-2025-08-07',
            purpose: 'Generate complete HTML content using dynamic structure and parse image references'
          },
          3: {
            name: 'Image Prompt Generator Service',
            file: 'image-prompt-generator.service.js',
            valid: promptApiValid,
            model: 'gpt-5-2025-08-07',
            purpose: 'Analyze HTML context and generate AI prompts for images'
          },
          4: {
            name: 'Image Generator Service',
            file: 'image-generator.service.js',
            valid: imageApiValid,
            model: 'gpt-image-1',
            purpose: 'Generate WebP images using AI-contextual prompts'
          },
          5: {
            name: 'HTML Combiner Service',
            file: 'html-combiner.service.js',
            valid: true,
            model: 'N/A (Local processing)',
            purpose: 'Embed images as base64 and create self-contained HTML'
          },
          6: {
            name: 'Site Generator Service',
            file: 'generator.service.js',
            valid: true,
            model: 'N/A (Orchestration)',
            purpose: 'Main orchestrator for the complete enhanced workflow'
          }
        },
        apiKey: {
          valid: structureApiValid && htmlApiValid && imageApiValid && promptApiValid,
          set: !!this.config.openai.apiKey
        },
        ready: configValidation.isValid && structureApiValid && htmlApiValid && imageApiValid && promptApiValid
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
