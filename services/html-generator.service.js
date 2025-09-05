const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class HTMLGeneratorService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey
    });
    
    this.model = 'gpt-5-2025-08-07';
  }

  /**
   * Generate HTML content using GPT-5 model
   * @param {Object} params - Generation parameters
   * @param {string} params.primaryKeyword - Primary SEO keyword
   * @param {string} params.canonicalUrl - Canonical URL for the site
   * @param {Object} params.hreflangUrls - Hreflang URLs for different languages
   * @param {Array<string>} params.secondaryKeywords - Secondary keywords
   * @param {Array<string>} params.focusAreas - Focus areas for content
   * @param {Object} params.structurePlan - Dynamic structure plan from structure generator
   * @returns {Promise<string>} Generated HTML content
   */
  async generateHTML(params) {
    try {
      const { 
        primaryKeyword, 
        canonicalUrl, 
        hreflangUrls = {}, 
        secondaryKeywords = [], 
        focusAreas = [],
        structurePlan 
      } = params;
      
      // Load the content generation prompt
      const promptTemplate = await this.loadPromptTemplate('content-generation-prompt.md');
      
      // Prepare structure plan information for the prompt
      let structureInstructions = '';
      if (structurePlan && structurePlan.structure) {
        structureInstructions = `

## DYNAMIC STRUCTURE PLAN (USE THIS TO CUSTOMIZE THE HTML)

The AI has analyzed your business requirements and generated a dynamic structure plan. 
IMPORTANT: Use this structure plan to customize the HTML template instead of using the static template.

### Dynamic Structure Information:
- Total Sections: ${structurePlan.structure.sections.length}
- Features Count: ${structurePlan.structure.features.count}
- Campaigns Count: ${structurePlan.structure.campaigns.count}
- FAQ Count: ${structurePlan.structure.faq.count}
- Primary Focus: ${structurePlan.structure.content_emphasis?.primary_focus || 'general'}
- Secondary Focus: ${structurePlan.structure.content_emphasis?.secondary_focus || 'none'}

### Section Configuration:
${structurePlan.structure.sections.map(section => 
  `- ${section.name} (Priority: ${section.priority}, Required: ${section.required}, Focus: ${section.focus})`
).join('\n')}

### Feature Types to Include:
${structurePlan.structure.features.types?.join(', ') || 'standard features'}

### Campaign Types to Include:
${structurePlan.structure.campaigns.types?.join(', ') || 'standard campaigns'}

### FAQ Categories:
${structurePlan.structure.faq.categories?.join(', ') || 'general categories'}

### Unique Elements to Add:
${structurePlan.unique_elements?.join(', ') || 'none specified'}

### SEO Strategy:
- Title Focus: ${structurePlan.seo_strategy?.title_focus || 'primary keyword'}
- Description Focus: ${structurePlan.seo_strategy?.description_focus || 'benefits'}

**INSTRUCTIONS**: 
1. Use the sections listed above in the specified order
2. Create the exact number of features and campaigns specified
3. Focus on the primary and secondary focus areas mentioned
4. Include the unique elements specified
5. Maintain all mandatory SEO and hreflang elements
6. Generate content that reflects the business focus areas: ${focusAreas.join(', ')}`;
      }
      
      // Replace placeholders in the prompt
      const prompt = this.replacePlaceholders(promptTemplate, {
        PRIMARY_KEYWORD: primaryKeyword,
        CANONICAL_URL: canonicalUrl,
        HREFLANG_URLS: JSON.stringify(hreflangUrls),
        SECONDARY_KEYWORDS: secondaryKeywords.join(', '),
        FOCUS_AREAS: focusAreas.join(', ')
      }) + structureInstructions;

      console.log('🚀 Generating HTML content with GPT-5...');
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO content strategist and web developer specializing in high-quality YMYL gambling websites that meet Google E-E-A-T standards. You excel at creating dynamic, unique structures based on business requirements while maintaining mandatory SEO elements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 16000
      });

      const generatedHTML = response.choices[0].message.content;
      
      console.log('✅ HTML content generated successfully');
      console.log(`📊 Tokens used: ${response.usage.total_tokens}`);
      
      return generatedHTML;
    } catch (error) {
      console.error('❌ Error generating HTML content:', error.message);
      throw new Error(`HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Parse HTML content to find image references
   * @param {string} htmlContent - The generated HTML content
   * @returns {Array<Object>} Array of image references found in HTML
   */
  parseImageReferences(htmlContent) {
    const imageReferences = [];
    
    // Find all img tags and extract src attributes
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const srcValue = match[1];
      
      // Skip data URLs and external URLs
      if (!srcValue.startsWith('data:') && !srcValue.startsWith('http')) {
        imageReferences.push({
          originalSrc: srcValue,
          filename: path.basename(srcValue),
          directory: path.dirname(srcValue),
          fullMatch: match[0]
        });
      }
    }

    // Find CSS background images
    const bgRegex = /background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
    while ((match = bgRegex.exec(htmlContent)) !== null) {
      const srcValue = match[1];
      
      if (!srcValue.startsWith('data:') && !srcValue.startsWith('http')) {
        imageReferences.push({
          originalSrc: srcValue,
          filename: path.basename(srcValue),
          directory: path.dirname(srcValue),
          fullMatch: match[0],
          type: 'background'
        });
      }
    }

    // Find other image references (favicon, etc.)
    const linkRegex = /<link[^>]+href=["']([^"']+\.(?:ico|png|jpg|jpeg|webp))["'][^>]*>/gi;
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const srcValue = match[1];
      
      if (!srcValue.startsWith('data:') && !srcValue.startsWith('http')) {
        imageReferences.push({
          originalSrc: srcValue,
          filename: path.basename(srcValue),
          directory: path.dirname(srcValue),
          fullMatch: match[0],
          type: 'link'
        });
      }
    }

    console.log(`🔍 Found ${imageReferences.length} image references in HTML`);
    return imageReferences;
  }

  /**
   * Load prompt template from file
   * @param {string} filename - Prompt template filename
   * @returns {Promise<string>} Prompt template content
   */
  async loadPromptTemplate(filename) {
    try {
      const promptPath = path.join(__dirname, '..', 'prompts', filename);
      return await fs.readFile(promptPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load prompt template: ${filename}`);
    }
  }

  /**
   * Replace placeholders in template with actual values
   * @param {string} template - Template string with placeholders
   * @param {Object} values - Values to replace placeholders
   * @returns {string} Template with replaced values
   */
  replacePlaceholders(template, values) {
    let result = template;
    
    Object.entries(values).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  }

  /**
   * Validate API key and test connection
   * @returns {Promise<boolean>} True if API key is valid
   */
  async validateApiKey() {
    try {
      const response = await this.client.models.list();
      console.log('✅ OpenAI API key is valid for HTML generation');
      return true;
    } catch (error) {
      console.error('❌ Invalid OpenAI API key:', error.message);
      return false;
    }
  }
}

module.exports = HTMLGeneratorService;
