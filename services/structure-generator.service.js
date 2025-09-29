const OpenAI = require('openai');
const { getConfig } = require('../config/openai.config');
const { GamblingWebsiteStructure, GamblingWebsiteStructureSchema } = require('../schemas/structure.schema');
const fs = require('fs').promises;
const path = require('path');

class StructureGeneratorService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey
    });
    
    this.config = getConfig();
    this.model = this.config.openai.models.gpt5nano; // GPT-5 Nano
  }

  /**
   * Generate dynamic HTML structure based on requirements
   * @param {Object} params - Generation parameters
   * @param {string} params.primaryKeyword - Primary SEO keyword
   * @param {Array<string>} params.focusAreas - Focus areas to emphasize
   * @param {Array<string>} params.secondaryKeywords - Secondary keywords
   * @param {string} params.brandName - Brand name
   * @returns {Promise<Object>} Dynamic structure plan
   */
  async generateStructure(params) {
    try {
      const { primaryKeyword, focusAreas, secondaryKeywords, brandName } = params;
      
      console.log('📐 Analyzing requirements to generate dynamic HTML structure...');
      
      // Load the structure generation prompt template
      const promptTemplate = await this.loadPromptTemplate('structure-generation-prompt.md');
      
      // Replace placeholders in the prompt
      const structurePrompt = this.replacePlaceholders(promptTemplate, {
        PRIMARY_KEYWORD: primaryKeyword,
        FOCUS_AREAS: focusAreas.join(', '),
        SECONDARY_KEYWORDS: secondaryKeywords.join(', '),
        BRAND_NAME: brandName
      });
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert web architect specializing in gambling website structures. Generate dynamic HTML structures based on business requirements, keeping canonical SEO tags and hreflang mandatory. Analyze the focus areas and choose appropriate sections, features, and content strategy.'
          },
          {
            role: 'user',
            content: structurePrompt
          }
        ],
        max_completion_tokens: 2000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "gambling_website_structure",
            description: "Dynamic structure plan for gambling website based on business requirements",
            schema: GamblingWebsiteStructureSchema
          }
        }
      });

      const structurePlan = this.parseStructureResponse(response.choices[0].message.content);
      
      console.log('✅ Dynamic structure plan generated');
      console.log(`📊 Tokens used for structure planning: ${response.usage.total_tokens}`);
      
      return {
        success: true,
        structurePlan,
        tokensUsed: response.usage.total_tokens
      };
      
    } catch (error) {
      console.error('❌ Structure generation failed:', error.message);
      throw new Error(`Structure generation failed: ${error.message}`);
    }
  }

  /**
   * Parse structure response into usable format
   * @param {string} content - GPT response content
   * @returns {Object} Parsed structure plan
   */
  parseStructureResponse(content) {
    try {
      // Parse the structured JSON output
      const structureData = JSON.parse(content);
      
      // Validate against Zod schema
      const validatedStructure = GamblingWebsiteStructure.parse(structureData);
      
      console.log('✅ Structure plan validated successfully');
      console.log(`📊 Generated ${validatedStructure.structure.sections.length} sections`);
      console.log(`🎯 Primary focus: ${validatedStructure.structure.content_emphasis.primary_focus}`);
      console.log(`🔧 Unique elements: ${validatedStructure.unique_elements.join(', ')}`);
      
      return validatedStructure;
      
    } catch (error) {
      console.warn('⚠️ Failed to parse/validate structure response, using default structure');
      console.warn('Error:', error.message);
      
      // Return a default structure if parsing/validation fails
      return {
        structure: {
          sections: [
            { name: "hero", priority: 1, required: true, focus: "security_trust" },
            { name: "about", priority: 2, required: true, focus: "security_trust" },
            { name: "features", priority: 3, required: true, focus: "security_trust" },
            { name: "campaigns", priority: 4, required: true, focus: "bonus_rewards" },
            { name: "faq", priority: 5, required: true, focus: "security_trust" },
            { name: "contact", priority: 6, required: true, focus: "customer_service" }
          ],
          features: {
            count: 4,
            focus: "security_trust",
            types: ["ssl_security", "mobile_optimization", "customer_support", "payment_security"]
          },
          campaigns: {
            count: 3,
            focus: "bonus_rewards",
            types: ["welcome_bonus", "reload_bonus", "vip_program"]
          },
          faq: {
            count: 8,
            categories: ["security", "payments", "bonuses", "general"],
            primary_focus: "security_trust"
          },
          content_emphasis: {
            primary_focus: "security_trust",
            secondary_focus: "mobile_experience",
            tone: "trustworthy_professional"
          }
        },
        seo_strategy: {
          title_focus: "primary_keyword",
          description_focus: "security_and_reliability",
          schema_priority: ["FAQ", "Organization", "BreadcrumbList"]
        },
        unique_elements: ["security_certification_showcase", "mobile_app_download_section"],
        reasoning: {
          structure_rationale: "Default structure prioritizing security and trust for gambling site",
          focus_justification: "Security focus builds trust required for financial transactions",
          differentiation_strategy: "Emphasis on security certifications and mobile experience"
        }
      };
    }
  }

  /**
   * Load prompt template from file
   * @param {string} filename - Prompt template filename
   * @returns {Promise<string>} Prompt template content
   */
  async loadPromptTemplate(filename) {
    try {
      const promptPath = path.join(process.cwd(), 'prompts', filename);
      const content = await fs.readFile(promptPath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to load prompt template ${filename}: ${error.message}`);
    }
  }

  /**
   * Replace placeholders in prompt template
   * @param {string} template - Prompt template
   * @param {Object} replacements - Key-value pairs for replacements
   * @returns {string} Template with placeholders replaced
   */
  replacePlaceholders(template, replacements) {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    return result;
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} API key validity
   */
  async validateApiKey() {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_completion_tokens: 5
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = StructureGeneratorService;