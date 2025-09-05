const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class ImagePromptGeneratorService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey
    });
    
    this.model = 'gpt-5-2025-08-07'; // Use GPT-5 for intelligent prompt generation
  }

  /**
   * Generate contextual image prompts by analyzing HTML content
   * @param {string} htmlContent - The generated HTML content
   * @param {Array<Object>} imageReferences - Array of image references found in HTML
   * @param {string} primaryKeyword - Primary keyword for context
   * @returns {Promise<Array<Object>>} Enhanced image references with AI-generated prompts
   */
  async generateContextualPrompts(htmlContent, imageReferences, primaryKeyword) {
    try {
      console.log('🤖 Analyzing HTML content to generate contextual image prompts...');
      
      // Create a detailed prompt for GPT-5 to analyze the HTML and generate image prompts
      const analysisPrompt = this.createAnalysisPrompt(htmlContent, imageReferences, primaryKeyword);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert image prompt generator and visual designer specializing in Turkish gambling websites. You analyze HTML content and create detailed, contextual prompts for image generation that will perfectly match the content and design needs.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_completion_tokens: 8000
      });

      const promptsResponse = response.choices[0].message.content;
      
      // Parse the response to extract individual image prompts
      const enhancedReferences = this.parseGeneratedPrompts(promptsResponse, imageReferences);
      
      console.log(`✅ Generated ${enhancedReferences.length} contextual image prompts`);
      console.log(`📊 Tokens used for prompt analysis: ${response.usage.total_tokens}`);
      
      return enhancedReferences;
    } catch (error) {
      console.error('❌ Error generating contextual prompts:', error.message);
      // Fallback to original references with basic prompts
      return imageReferences.map(ref => ({
        ...ref,
        aiGeneratedPrompt: this.createFallbackPrompt(ref, primaryKeyword),
        promptSource: 'fallback'
      }));
    }
  }

  /**
   * Create a comprehensive analysis prompt for GPT-5
   * @param {string} htmlContent - HTML content to analyze
   * @param {Array<Object>} imageReferences - Image references found
   * @param {string} primaryKeyword - Primary keyword
   * @returns {string} Analysis prompt
   */
  createAnalysisPrompt(htmlContent, imageReferences, primaryKeyword) {
    const imageList = imageReferences.map((ref, index) => 
      `${index + 1}. ${ref.filename} (located in: ${ref.originalSrc})`
    ).join('\n');

    return `TASK: Generate detailed image prompts for a Turkish gambling website about "${primaryKeyword}"

HTML CONTENT TO ANALYZE:
\`\`\`html
${htmlContent.substring(0, 12000)}${htmlContent.length > 12000 ? '\n... (content truncated)' : ''}
\`\`\`

IMAGES THAT NEED TO BE GENERATED:
${imageList}

REQUIREMENTS:
1. Analyze the HTML content to understand the context where each image will appear
2. Consider the surrounding text, section purpose, and overall design theme
3. Generate specific, detailed prompts for GPT-Image-1 model
4. Use Turkish gambling industry appropriate themes
5. Maintain brand colors: dark blue (#0d1421) and gold (#f5c542)
6. Ensure 18+ appropriate content for YMYL gambling sites
7. Consider Turkish cultural appropriateness

RESPONSE FORMAT:
For each image, provide:

IMAGE_[number]: [filename]
CONTEXT: [Where this image appears in the HTML and its purpose]
PROMPT: [Detailed prompt for GPT-Image-1 - be specific about colors, style, elements, mood]
SIZE_RECOMMENDATION: [Optimal dimensions based on usage]

EXAMPLE:
IMAGE_1: hero-bg-paribahis.jpg
CONTEXT: Main hero section background for landing page
PROMPT: Professional Turkish gambling website hero background for Paribahis. Dark blue gradient (#0d1421 to #1a2f4a) with subtle gold accents. Abstract geometric casino patterns, Turkish cultural elements. Modern, sophisticated, trustworthy design. No text overlays. 18+ appropriate.
SIZE_RECOMMENDATION: 1792x1024

Please analyze the HTML and generate appropriate prompts for each image:`;
  }

  /**
   * Parse GPT-5 response to extract individual image prompts
   * @param {string} response - GPT-5 response
   * @param {Array<Object>} originalReferences - Original image references
   * @returns {Array<Object>} Enhanced references with AI prompts
   */
  parseGeneratedPrompts(response, originalReferences) {
    const enhancedReferences = [];
    const lines = response.split('\n');
    
    let currentImage = null;
    let currentContext = '';
    let currentPrompt = '';
    let currentSize = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('IMAGE_')) {
        // Save previous image if exists
        if (currentImage) {
          this.addEnhancedReference(enhancedReferences, originalReferences, currentImage, currentContext, currentPrompt, currentSize);
        }
        
        // Start new image
        const match = trimmed.match(/IMAGE_\d+:\s*(.+)/);
        currentImage = match ? match[1] : null;
        currentContext = '';
        currentPrompt = '';
        currentSize = '';
      } else if (trimmed.startsWith('CONTEXT:')) {
        currentContext = trimmed.replace('CONTEXT:', '').trim();
      } else if (trimmed.startsWith('PROMPT:')) {
        currentPrompt = trimmed.replace('PROMPT:', '').trim();
      } else if (trimmed.startsWith('SIZE_RECOMMENDATION:')) {
        currentSize = trimmed.replace('SIZE_RECOMMENDATION:', '').trim();
      } else if (currentPrompt && trimmed && !trimmed.startsWith('IMAGE_') && !trimmed.startsWith('CONTEXT:') && !trimmed.startsWith('SIZE_RECOMMENDATION:')) {
        // Continue prompt on next line
        currentPrompt += ' ' + trimmed;
      }
    }
    
    // Don't forget the last image
    if (currentImage) {
      this.addEnhancedReference(enhancedReferences, originalReferences, currentImage, currentContext, currentPrompt, currentSize);
    }
    
    // Fill any missing references with fallback prompts
    originalReferences.forEach(ref => {
      if (!enhancedReferences.find(enhanced => enhanced.filename === ref.filename)) {
        enhancedReferences.push({
          ...ref,
          aiGeneratedPrompt: this.createFallbackPrompt(ref, 'Paribahis'),
          contextAnalysis: 'Not analyzed - using fallback',
          promptSource: 'fallback'
        });
      }
    });
    
    return enhancedReferences;
  }

  /**
   * Add enhanced reference to the array
   * @param {Array} enhancedReferences - Array to add to
   * @param {Array} originalReferences - Original references to match
   * @param {string} filename - Image filename
   * @param {string} context - Context analysis
   * @param {string} prompt - Generated prompt
   * @param {string} size - Size recommendation
   */
  addEnhancedReference(enhancedReferences, originalReferences, filename, context, prompt, size) {
    const originalRef = originalReferences.find(ref => 
      ref.filename === filename || ref.filename.includes(filename) || filename.includes(ref.filename)
    );
    
    if (originalRef && prompt) {
      enhancedReferences.push({
        ...originalRef,
        aiGeneratedPrompt: prompt,
        contextAnalysis: context,
        sizeRecommendation: size,
        promptSource: 'ai-generated'
      });
    }
  }

  /**
   * Create fallback prompt if AI generation fails
   * @param {Object} imageRef - Image reference
   * @param {string} primaryKeyword - Primary keyword
   * @returns {string} Fallback prompt
   */
  createFallbackPrompt(imageRef, primaryKeyword) {
    const filename = imageRef.filename.toLowerCase();
    
    if (filename.includes('hero') || filename.includes('background')) {
      return `Professional hero background for Turkish gambling site ${primaryKeyword}. Dark blue gradient with gold accents. Modern, sophisticated design. 18+ appropriate.`;
    } else if (filename.includes('icon')) {
      return `Professional icon for ${primaryKeyword} betting platform. Blue background, gold symbol. Clean, modern design. Gambling industry appropriate.`;
    } else if (filename.includes('campaign')) {
      return `Campaign illustration for ${primaryKeyword} betting site. Blue and gold colors. Professional, attractive design. Turkish market appropriate.`;
    } else {
      return `Professional image for ${primaryKeyword} Turkish gambling website. Blue and gold color scheme. Modern, trustworthy design.`;
    }
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} True if valid
   */
  async validateApiKey() {
    try {
      await this.client.models.list();
      console.log('✅ OpenAI API key is valid for prompt generation');
      return true;
    } catch (error) {
      console.error('❌ Invalid OpenAI API key for prompt generation:', error.message);
      return false;
    }
  }
}

module.exports = ImagePromptGeneratorService;
