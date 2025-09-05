/**
 * OpenAI API Configuration
 */

const config = {
  // OpenAI API Settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    models: {
      gpt5: 'gpt-5-2025-08-07',
      gpt5nano: 'gpt-5-nano',
      gpt41: 'gpt-4.1-2025-04-14', // New GPT-4.1 model
      gpt4: 'gpt-4-turbo-2024-04-09', // Fallback model
      gptImage1: 'gpt-image-1',
      dalle3: 'dall-e-3' // Legacy support
    },
    limits: {
      maxTokens: 16000,
      temperature: 0.7,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  },

  // Image Generation Settings
  images: {
    quality: 'hd',
    style: 'natural',
    sizes: {
      hero: '1792x1024',
      icon: '1024x1024',
      campaign: '1024x1024',
      favicon: '1024x1024'
    },
    formats: {
      background: 'jpg',
      icon: 'png',
      campaign: 'jpg',
      support: 'png',
      favicon: 'png'
    }
  },

  // Rate Limiting
  rateLimits: {
    requestDelay: 1000, // 1 second between image requests
    maxRetries: 3,
    retryDelay: 2000
  },

  // File Structure
  paths: {
    prompts: './prompts',
    output: './output',
    assets: 'assets',
    images: 'assets/images'
  },

  // SEO Settings
  seo: {
    defaultLanguage: 'tr',
    titleMaxLength: 60,
    descriptionMaxLength: 160,
    keywordsCount: 15
  },

  // Content Requirements
  content: {
    aboutWordCount: { min: 300, max: 400 },
    featureDescriptionWordCount: { min: 50, max: 80 },
    campaignDescriptionWordCount: { min: 80, max: 120 },
    faqAnswerWordCount: { min: 100, max: 150 },
    sectionsRequired: [
      'hero',
      'about', 
      'features',
      'campaigns',
      'faq',
      'contact'
    ]
  },

  // Compliance Settings
  compliance: {
    ageRestriction: '18+',
    language: 'tr',
    gambling: {
      responsibleGamblingRequired: true,
      ageVerificationRequired: true,
      termsAndConditionsRequired: true
    }
  }
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];

  // Check API key
  if (!config.openai.apiKey) {
    errors.push('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
  }

  // Check required paths
  if (!config.paths.prompts) {
    errors.push('Prompts path is required');
  }

  if (!config.paths.output) {
    errors.push('Output path is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration with environment overrides
 */
function getConfig() {
  return {
    ...config,
    openai: {
      ...config.openai,
      apiKey: process.env.OPENAI_API_KEY || config.openai.apiKey
    }
  };
}

module.exports = {
  config,
  validateConfig,
  getConfig
};
