const AIServiceInterface = require('../base/ai-service.interface');
const OpenAI = require('openai');
const PromptService = require('../utilities/prompt.service');
const { OpenAIError } = require('../../src/utils/errors');
const { GamblingWebsiteStructureSchema } = require('../../schemas/structure.schema');
const fs = require('fs').promises;
const path = require('path');

/**
 * Structure Service
 * Refactored version of structure-generator.service.js
 * Generates dynamic website structures using GPT-5-2025-08-07 with production-ready architecture
 */
class StructureService extends AIServiceInterface {
  constructor(apiKey, config = {}) {
    super(apiKey, config);
    
    this.model = config.model || 'gpt-5-2025-08-07';
    this.client = new OpenAI({ apiKey });
    
    this.config = {
      maxRetries: 3,
      timeout: 60000,
      maxTokens: 128000,
      promptsDirectory: config.promptsDirectory || './prompts',
      ...config
    };

    // Initialize prompt service
    this.promptService = new PromptService({
      promptsDirectory: this.config.promptsDirectory,
      cacheEnabled: config.cachePrompts !== false
    });
  }

  /**
   * Generate website structure (implements AIServiceInterface.generate)
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Generated structure with metadata
   */
  async generate(params) {
    return await this.generateStructure(params);
  }

  /**
   * Process response from AI service (implements AIServiceInterface.processResponse)
   * @param {object} response - Raw API response
   * @returns {object} - Processed structure data
   */
  processResponse(response) {
    return this.parseStructureResponse(response);
  }

  /**
   * Generate website structure based on keywords and brand
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} - Generated structure with metadata
   */
  async generateStructure(params) {
    this.logOperation('generateStructure', { 
      primaryKeyword: params.primaryKeyword,
      secondaryKeywords: params.secondaryKeywords?.length || 0,
      model: this.model 
    });

    const startTime = Date.now();

    try {
      this.validateRequired(params, ['primaryKeyword', 'brandName']);

      const prompt = await this.buildStructurePrompt(params);
      const response = await this.executeWithRetry(
        async () => await this.makeApiCall(prompt),
        'makeApiCall',
        this.config.maxRetries
      );

      const structure = this.parseStructureResponse(response);
      const duration = Date.now() - startTime;

      // Save structure to debug file if outputDir is available
      if (params.outputDir) {
        await this.saveStructureDebugFile(structure, params.outputDir, params.primaryKeyword);
      }

      // Update usage statistics
      this.updateUsageStats({
        requests: 1,
        tokens: response.usage?.total_tokens || 0,
        successful: 1,
        responseTime: duration
      });

      const result = {
        success: true,
        structure,
        metadata: {
          tokensUsed: response.usage?.total_tokens || 0,
          model: this.model,
          duration,
          timestamp: new Date().toISOString()
        }
      };

      this.logOperation('Structure generation completed', { 
        duration,
        tokensUsed: response.usage?.total_tokens,
        sectionsGenerated: structure.structure?.sections?.length || 0
      });

      // Return result prepared for chaining to other services
      return this.prepareForChaining(result);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateUsageStats({ errors: 1, responseTime: duration });
      this.logError(error, { 
        operation: 'generateStructure',
        params, 
        duration 
      });
      
      throw new OpenAIError(
        `Structure generation failed: ${error.message}`, 
        this.model, 
        error.code
      );
    }
  }

  /**
   * Build structure generation prompt using professional template
   * @param {object} params - Generation parameters
   * @returns {Promise<string>} - Generated prompt from template
   */
  async buildStructurePrompt(params) {
    this.logOperation('buildStructurePrompt', { 
      primaryKeyword: params.primaryKeyword,
      focusAreas: params.focusAreas?.length || 0,
      usingTemplate: true 
    });

    try {
      // Import schema enums to include in prompt
      const {
        SectionType,
        FeatureType,
        CampaignType,
        FAQCategory,
        ContentFocus,
        UniqueElement
      } = require('../../schemas/structure.schema');

      // Extract enum values for prompt
      const availableOptions = {
        sections: SectionType.options.join(', '),
        features: FeatureType.options.join(', '),
        campaigns: CampaignType.options.join(', '),
        faqCategories: FAQCategory.options.join(', '),
        contentFocus: ContentFocus.options.join(', '),
        uniqueElements: UniqueElement.options.join(', ')
      };

      // Use the professional structure generation prompt template
      const prompt = await this.promptService.getStructureGenerationPrompt({
        primaryKeyword: params.primaryKeyword,
        secondaryKeywords: params.secondaryKeywords || [],
        brandName: params.brandName,
        focusAreas: params.focusAreas || ['güvenlik', 'mobil', 'bonus'],
        targetAudience: 'Turkish betting enthusiasts',
        businessType: 'online betting platform',
        contentType: 'landing page',
        // Include all available schema options
        AVAILABLE_SECTIONS: availableOptions.sections,
        AVAILABLE_FEATURES: availableOptions.features,
        AVAILABLE_CAMPAIGNS: availableOptions.campaigns,
        AVAILABLE_FAQ_CATEGORIES: availableOptions.faqCategories,
        AVAILABLE_CONTENT_FOCUS: availableOptions.contentFocus,
        AVAILABLE_UNIQUE_ELEMENTS: availableOptions.uniqueElements
      });

      this.logOperation('Structure prompt built from template', {
        promptLength: prompt.length,
        templateUsed: 'structure-generation-prompt',
        sectionsAvailable: SectionType.options.length,
        featuresAvailable: FeatureType.options.length,
        campaignsAvailable: CampaignType.options.length
      });

      return prompt;

    } catch (error) {
      this.logError(error, { operation: 'buildStructurePrompt' });
      
      // Fallback to basic prompt if template fails
      this.logOperation('Using fallback prompt due to template error');
      return this.buildFallbackPrompt(params);
    }
  }

  /**
   * Build fallback prompt if template loading fails
   * @param {object} params - Generation parameters
   * @returns {string} - Fallback prompt
   */
  buildFallbackPrompt(params) {
    const { primaryKeyword, secondaryKeywords = [], brandName } = params;
    
    return `You are an expert web architect specializing in gambling and betting website structures.

Create a comprehensive website structure for a ${primaryKeyword} site branded as "${brandName}".

Requirements:
- Primary focus: ${primaryKeyword}
- Secondary keywords: ${secondaryKeywords.join(', ') || 'None specified'}
- Brand: ${brandName}
- Target: Turkish gambling market
- Compliance: E-E-A-T guidelines
- SEO optimized structure

Generate a JSON structure with:
1. site_metadata (title, description, keywords)
2. navigation (main menu items)
3. sections (detailed page sections with content hints)
4. seo_elements (meta tags, schema markup suggestions)
5. conversion_elements (CTA placements, trust signals)

Focus on:
- User experience and conversion optimization
- SEO best practices for YMYL content
- Trust and authority building
- Responsible gambling messaging
- Mobile-first design considerations

Return only valid JSON without markdown formatting.`;
  }

  /**
   * Make API call to OpenAI with structured output
   * @param {string} prompt - Generation prompt
   * @returns {Promise<object>} - API response with structured data
   */
  async makeApiCall(prompt) {
    try {
      this.logOperation('Making structured API call', { 
        model: this.model, 
        promptLength: prompt.length,
        usingStructuredOutput: true
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
            content: prompt 
          }
        ],
        max_completion_tokens: this.config.maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "gambling_website_structure",
            description: "Dynamic structure plan for gambling website based on business requirements",
            schema: GamblingWebsiteStructureSchema,
            strict: true
          }
        }
      });

      // Log detailed response structure for debugging
      this.logOperation('Structured API call successful', { 
        tokensUsed: response.usage?.total_tokens,
        hasChoices: !!response.choices?.[0],
        hasContent: !!response.choices?.[0]?.message?.content,
        hasParsed: !!response.choices?.[0]?.message?.parsed,
        finishReason: response.choices?.[0]?.finish_reason
      });

      return response;

    } catch (error) {
      this.logError(error, { 
        operation: 'Structured API call failed',
        model: this.model 
      });
      throw new OpenAIError(`Structured API call failed: ${error.message}`, this.model, error.code);
    }
  }

  /**
   * Parse and validate structure response from structured output
   * @param {object} response - OpenAI structured API response
   * @returns {object} - Parsed and validated structure
   */
  parseStructureResponse(response) {
    this.logOperation('parseStructureResponse', {
      hasOutputParsed: !!response.output_parsed,
      hasChoicesParsed: !!response.choices?.[0]?.message?.parsed,
      hasOutputText: !!response.output_text,
      hasChoicesContent: !!response.choices?.[0]?.message?.content
    });

    try {
      // Debug: Log the actual response structure when detailed logging is enabled
      const { logLevelManager } = require('../../src/utils/log-levels');
      if (logLevelManager && logLevelManager.getLevel() === 'detailed') {
        this.log('Response structure debug', 'verbose', {
          responseKeys: Object.keys(response),
          choicesLength: response.choices?.length,
          firstChoiceKeys: response.choices?.[0] ? Object.keys(response.choices[0]) : null,
          messageKeys: response.choices?.[0]?.message ? Object.keys(response.choices[0].message) : null,
          refusalPresent: !!response.choices?.[0]?.message?.refusal,
          refusalText: response.choices?.[0]?.message?.refusal,
          contentType: typeof response.choices?.[0]?.message?.content,
          contentLength: response.choices?.[0]?.message?.content?.length || 0,
          finishReason: response.choices?.[0]?.finish_reason,
          parsedType: typeof response.choices?.[0]?.message?.parsed,
          hasParsedData: !!response.choices?.[0]?.message?.parsed
        });
      }

      // Check for refusal first
      if (response.choices && response.choices[0] && response.choices[0].message.refusal) {
        throw new Error(`OpenAI refused the request: ${response.choices[0].message.refusal}`);
      }

      // With structured outputs (strict: true), the response should be in message.parsed
      if (response.choices && response.choices[0] && response.choices[0].message.parsed) {
        this.logOperation('Using structured output from message.parsed');
        const parsed = response.choices[0].message.parsed;
        
        // Log the parsed structure for debugging
        if (logLevelManager && logLevelManager.getLevel() === 'detailed') {
          this.log('Parsed structure content', 'verbose', {
            parsedKeys: Object.keys(parsed),
            hasStructure: !!parsed.structure,
            hasSeoStrategy: !!parsed.seo_strategy,
            hasUniqueElements: !!parsed.unique_elements,
            hasReasoning: !!parsed.reasoning,
            structureSectionsCount: parsed.structure?.sections?.length || 0
          });
        }
        
        // Validate the structured output (should already be valid due to strict: true)
        this.validateStructuredOutput(parsed);
        return parsed;
      }

      // Fallback: Try legacy structured output formats
      if (response.output_parsed) {
        this.logOperation('Using legacy output_parsed format');
        this.validateStructuredOutput(response.output_parsed);
        return response.output_parsed;
      }

      // Fallback to parsing text content (for non-structured responses)
      let jsonText = '';
      
      if (response.output_text && typeof response.output_text === 'string') {
        jsonText = response.output_text;
      } else if (response.choices && response.choices[0]) {
        jsonText = response.choices[0].message.content || '';
      }

      if (!jsonText || typeof jsonText !== 'string') {
        throw new Error('No valid structured output or text content found in API response');
      }

      this.logOperation('Fallback: Parsing JSON from text content', {
        contentLength: jsonText.length,
        startsWithBrace: jsonText.trim().startsWith('{'),
        endsWithBrace: jsonText.trim().endsWith('}')
      });

      // Extract JSON from text content
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start === -1 || end === -1) {
        throw new Error('No JSON braces found in output');
      }

      let slice = jsonText.slice(start, end + 1).trim();
      let parsed;

      try {
        parsed = JSON.parse(slice);
        this.logOperation('JSON parsed successfully from text');
      } catch (e) {
        this.logOperation('Primary JSON parse failed, attempting repair');
        // Try to repair common JSON issues
        const repaired = slice
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        try {
          parsed = JSON.parse(repaired);
          this.logOperation('JSON parsed successfully after repair');
        } catch (e2) {
          this.logError(e2, { operation: 'JSON repair failed' });
          throw new Error('Failed to parse structured output JSON');
        }
      }

      // Validate parsed structure
      this.validateStructuredOutput(parsed);
      
      this.logOperation('Structure parsing completed successfully', {
        sectionsCount: parsed.structure?.sections?.length || 0,
        hasReasoning: !!parsed.reasoning,
        hasUniqueElements: !!parsed.unique_elements
      });

      return parsed;

    } catch (error) {
      this.logError(error, {
        operation: 'Structure parsing failed',
        errorMessage: error.message,
        errorStack: error.stack,
        responseHasChoices: !!response.choices,
        responseChoicesLength: response.choices?.length,
        firstChoiceType: typeof response.choices?.[0]
      });
      
      // Return default structure if parsing fails
      this.logOperation('Using fallback default structure');
      return this.getDefaultStructure();
    }
  }

  /**
   * Save structure to debug file for inspection
   * @param {object} structure - The parsed structure from AI API
   * @param {string} outputDir - Output directory path
   * @param {string} primaryKeyword - Primary keyword for filename
   */
  async saveStructureDebugFile(structure, outputDir, primaryKeyword) {
    try {
      // Create the output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });
      
      // Create sanitized filename based on primary keyword
      const sanitizedKeyword = primaryKeyword
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `structure-${sanitizedKeyword}-${timestamp}.json`;
      const filePath = path.join(outputDir, filename);
      
      // Create debug structure with metadata
      const debugStructure = {
        metadata: {
          timestamp: new Date().toISOString(),
          primaryKeyword,
          model: this.model,
          source: 'AI_API_RESPONSE',
          note: 'This is the raw structure parsed from OpenAI API response for debugging purposes'
        },
        structure
      };
      
      // Save to file
      await fs.writeFile(filePath, JSON.stringify(debugStructure, null, 2), 'utf8');
      
      this.logOperation('Structure debug file saved', {
        filePath,
        primaryKeyword,
        structureKeys: Object.keys(structure),
        sectionsCount: structure.structure?.sections?.length || 0
      });
      
    } catch (error) {
      this.logError(error, {
        operation: 'saveStructureDebugFile',
        outputDir,
        primaryKeyword
      });
      // Don't throw error - this is just for debugging, shouldn't break the workflow
    }
  }

  /**
   * Validate structured output against schema requirements
   * @param {object} structure - Structure to validate
   */
  validateStructuredOutput(structure) {
    // Debug: Log the actual structure when detailed logging is enabled
    const { logLevelManager } = require('../../src/utils/log-levels');
    if (logLevelManager && logLevelManager.getLevel() === 'detailed') {
      this.log('Validating structure', 'verbose', {
        structureKeys: Object.keys(structure),
        hasStructure: !!structure.structure,
        hasSeoStrategy: !!structure.seo_strategy,
        hasUniqueElements: !!structure.unique_elements,
        hasReasoning: !!structure.reasoning,
        structureSectionsCount: structure.structure?.sections?.length || 0,
        actualStructure: JSON.stringify(structure, null, 2).substring(0, 1000) + '...'
      });
    }

    // Basic structural validation - only require structure.sections
    if (!structure.structure || !Array.isArray(structure.structure.sections)) {
      throw new Error('Parsed JSON missing structure.sections');
    }

    // Add missing fields with defaults if they're not present (OpenAI schema compliance issue)
    if (!structure.seo_strategy) {
      this.logOperation('Adding default seo_strategy (missing from OpenAI response)');
      structure.seo_strategy = {
        title_focus: "primary_keyword",
        description_focus: "security_and_reliability", 
        schema_priority: ["FAQ", "Organization", "BreadcrumbList"]
      };
    }

    if (!structure.unique_elements || !Array.isArray(structure.unique_elements)) {
      this.logOperation('Adding default unique_elements (missing from OpenAI response)');
      structure.unique_elements = ["security_certification_showcase", "mobile_app_download_section"];
    }

    if (!structure.reasoning) {
      this.logOperation('Adding default reasoning (missing from OpenAI response)');
      structure.reasoning = {
        structure_rationale: "Structure generated based on gambling site best practices",
        focus_justification: "Focus areas selected to build trust and engagement",
        differentiation_strategy: "Emphasis on security and user experience for competitive advantage"
      };
    }

    // Validate sections have required properties
    const invalidSections = structure.structure.sections.filter(section => 
      !section.name || typeof section.priority !== 'number' || 
      typeof section.required !== 'boolean'
    );

    if (invalidSections.length > 0) {
      this.logOperation('Fixing invalid sections (missing required properties)');
      // Fix invalid sections by adding missing properties
      structure.structure.sections = structure.structure.sections.map(section => ({
        name: section.name || 'features',
        priority: typeof section.priority === 'number' ? section.priority : 1,
        required: typeof section.required === 'boolean' ? section.required : true,
        focus: section.focus || 'security_trust'
      }));
    }

    this.logOperation('Structured output validation passed (with corrections)', {
      sectionsCount: structure.structure.sections.length,
      uniqueElementsCount: structure.unique_elements.length,
      correctionsMade: true
    });
  }

  /**
   * Get default structure when parsing fails
   * @returns {object} - Default structure following schema
   */
  getDefaultStructure() {
    console.warn('Using default structure due to parsing failure');
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

  /**
   * Validate API key by making a test call
   * @returns {Promise<boolean>} - True if API key is valid
   */
  async validateApiKey() {
    try {
      await this.client.models.list();
      this.logOperation('API key validation successful');
      return true;
    } catch (error) {
      this.logError(error, { operation: 'API key validation failed' });
      return false;
    }
  }

  /**
   * Update usage statistics
   * @param {object} stats - Statistics to add
   */
  updateUsageStats(stats) {
    if (stats.requests) this.usageStats.totalRequests += stats.requests;
    if (stats.tokens) this.usageStats.totalTokens += stats.tokens;
    if (stats.errors) this.usageStats.errors += stats.errors;
    if (stats.successful) this.usageStats.successfulRequests += stats.successful;
    
    if (stats.responseTime) {
      // Calculate rolling average response time
      const totalResponses = this.usageStats.successfulRequests + this.usageStats.errors;
      this.usageStats.averageResponseTime = totalResponses > 1 
        ? Math.round((this.usageStats.averageResponseTime * (totalResponses - 1) + stats.responseTime) / totalResponses)
        : stats.responseTime;
    }
  }

  /**
   * Get usage statistics
   * @returns {object} - Current usage statistics
   */
  getUsageStats() {
    return { 
      ...this.usageStats,
      successRate: this.usageStats.totalRequests > 0 
        ? Math.round((this.usageStats.successfulRequests / this.usageStats.totalRequests) * 100)
        : 0
    };
  }

  /**
   * Get model information
   * @returns {object} - Model details
   */
  getModelInfo() {
    return {
      name: this.model,
      type: 'text-generation',
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      provider: 'OpenAI'
    };
  }

  /**
   * Get cost estimation (rough estimate)
   * @returns {object} - Cost estimation
   */
  getCostEstimation() {
    // Rough cost estimates (these would need to be updated based on actual OpenAI pricing)
    const costPer1KTokens = 0.002; // Example rate
    const estimatedCost = (this.usageStats.totalTokens / 1000) * costPer1KTokens;
    
    return {
      totalTokens: this.usageStats.totalTokens,
      estimatedCost: Math.round(estimatedCost * 10000) / 10000, // Round to 4 decimal places
      currency: 'USD',
      model: this.model
    };
  }
}

module.exports = StructureService;
