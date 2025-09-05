const { z } = require('zod');

// Define enums for gambling website structure elements
const SectionType = z.enum([
  'hero',
  'about',
  'features', 
  'security',
  'mobile',
  'sports_betting',
  'casino_games',
  'live_betting',
  'campaigns',
  'bonuses',
  'vip_program',
  'payment_methods',
  'faq',
  'testimonials',
  'reviews',
  'contact',
  'responsible_gambling',
  'licensing'
]).describe('Type of website section');

const FeatureType = z.enum([
  'ssl_security',
  'data_encryption', 
  'license_verification',
  'mobile_optimization',
  'mobile_app',
  'responsive_design',
  'payment_security',
  'fast_withdrawals',
  'multiple_payment_methods',
  'customer_support',
  'live_chat',
  '24_7_support',
  'odds_quality',
  'live_streaming',
  'cash_out',
  'in_play_betting',
  'casino_variety',
  'live_dealers',
  'game_providers'
]).describe('Type of feature to highlight');

const CampaignType = z.enum([
  'welcome_bonus',
  'first_deposit_bonus',
  'reload_bonus',
  'cashback_bonus',
  'free_bets',
  'accumulator_bonus',
  'vip_program',
  'loyalty_rewards',
  'daily_promotions',
  'weekly_promotions',
  'monthly_promotions',
  'tournament_bonuses',
  'referral_bonus',
  'mobile_bonus'
]).describe('Type of campaign or bonus offer');

const FAQCategory = z.enum([
  'registration',
  'account_verification',
  'deposits',
  'withdrawals',
  'payment_methods',
  'bonuses',
  'wagering_requirements',
  'security',
  'privacy',
  'mobile_usage',
  'technical_support',
  'responsible_gambling',
  'licensing',
  'general'
]).describe('FAQ category for user questions');

const ContentFocus = z.enum([
  'security_trust',
  'mobile_experience', 
  'bonus_rewards',
  'sports_betting',
  'casino_gaming',
  'customer_service',
  'payment_convenience',
  'live_betting',
  'user_experience',
  'regulatory_compliance'
]).describe('Primary content focus area');

const SEOFocus = z.enum([
  'primary_keyword',
  'security_and_reliability',
  'bonuses_and_promotions',
  'mobile_experience',
  'sports_betting',
  'casino_games',
  'trust_indicators',
  'user_benefits',
  'competitive_advantages'
]).describe('SEO strategy focus');

const UniqueElement = z.enum([
  'security_certification_showcase',
  'mobile_app_download_section',
  'live_chat_integration',
  'odds_comparison_tool',
  'betting_calculator',
  'live_scores_widget',
  'game_demo_section',
  'winner_testimonials',
  'payment_security_badges',
  'regulatory_compliance_section',
  'responsible_gambling_tools',
  'social_proof_elements',
  'trust_pilot_reviews',
  'industry_awards_showcase'
]).describe('Unique website elements to include');

// Main structure schema
const GamblingWebsiteStructure = z.object({
  structure: z.object({
    sections: z.array(z.object({
      name: SectionType,
      priority: z.number().min(1).max(20).describe('Section display priority (1 = highest)'),
      required: z.boolean().describe('Whether this section is mandatory'),
      focus: ContentFocus.describe('Content focus for this section')
    })).min(4).max(12).describe('Website sections in priority order'),

    features: z.object({
      count: z.number().min(3).max(8).describe('Number of feature cards to display'),
      focus: ContentFocus.describe('Primary focus for feature selection'),
      types: z.array(FeatureType).min(3).max(8).describe('Specific feature types to include')
    }).describe('Feature section configuration'),

    campaigns: z.object({
      count: z.number().min(2).max(6).describe('Number of campaign/bonus offers'),
      focus: ContentFocus.describe('Campaign focus area'),
      types: z.array(CampaignType).min(2).max(6).describe('Types of campaigns to feature')
    }).describe('Campaign section configuration'),

    faq: z.object({
      count: z.number().min(6).max(15).describe('Number of FAQ items'),
      categories: z.array(FAQCategory).min(3).max(8).describe('FAQ categories to cover'),
      primary_focus: ContentFocus.describe('Primary focus for FAQ content')
    }).describe('FAQ section configuration'),

    content_emphasis: z.object({
      primary_focus: ContentFocus.describe('Main content focus throughout site'),
      secondary_focus: ContentFocus.describe('Secondary content focus'),
      tone: z.enum(['trustworthy_professional', 'exciting_dynamic', 'secure_reliable', 'user_friendly_approachable']).describe('Content tone and style')
    }).describe('Overall content strategy')
  }).describe('Website structure configuration'),

  seo_strategy: z.object({
    title_focus: SEOFocus.describe('Primary focus for title tags'),
    description_focus: SEOFocus.describe('Primary focus for meta descriptions'),
    schema_priority: z.array(z.enum(['FAQ', 'Organization', 'BreadcrumbList', 'WebSite', 'Review'])).describe('Structured data priority order')
  }).describe('SEO optimization strategy'),

  unique_elements: z.array(UniqueElement).min(1).max(5).describe('Special unique elements to make the site stand out'),

  reasoning: z.object({
    structure_rationale: z.string().max(200).describe('Brief explanation of why this structure was chosen'),
    focus_justification: z.string().max(200).describe('Why these focus areas match the business requirements'),
    differentiation_strategy: z.string().max(200).describe('How this structure will differentiate from competitors')
  }).describe('AI reasoning for structure decisions')
}).describe('Complete gambling website structure plan');

// JSON Schema for OpenAI structured output
const GamblingWebsiteStructureSchema = {
  type: "object",
  description: "Complete gambling website structure plan",
  properties: {
    structure: {
      type: "object",
      description: "Website structure configuration",
      properties: {
        sections: {
          type: "array",
          description: "Website sections in priority order",
          minItems: 4,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                enum: ["hero", "about", "features", "security", "mobile", "sports_betting", "casino_games", "live_betting", "campaigns", "bonuses", "vip_program", "payment_methods", "faq", "testimonials", "reviews", "contact", "responsible_gambling", "licensing"],
                description: "Type of website section"
              },
              priority: {
                type: "number",
                minimum: 1,
                maximum: 20,
                description: "Section display priority (1 = highest)"
              },
              required: {
                type: "boolean",
                description: "Whether this section is mandatory"
              },
              focus: {
                type: "string",
                enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance"],
                description: "Content focus for this section"
              }
            },
            required: ["name", "priority", "required", "focus"],
            additionalProperties: false
          }
        },
        features: {
          type: "object",
          description: "Feature section configuration",
          properties: {
            count: {
              type: "number",
              minimum: 3,
              maximum: 8,
              description: "Number of feature cards to display"
            },
            focus: {
              type: "string",
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance"],
              description: "Primary focus for feature selection"
            },
            types: {
              type: "array",
              description: "Specific feature types to include",
              minItems: 3,
              maxItems: 8,
              items: {
                type: "string",
                enum: ["ssl_security", "data_encryption", "license_verification", "mobile_optimization", "mobile_app", "responsive_design", "payment_security", "fast_withdrawals", "multiple_payment_methods", "customer_support", "live_chat", "24_7_support", "odds_quality", "live_streaming", "cash_out", "in_play_betting", "casino_variety", "live_dealers", "game_providers"]
              }
            }
          },
          required: ["count", "focus", "types"],
          additionalProperties: false
        },
        campaigns: {
          type: "object",
          description: "Campaign section configuration",
          properties: {
            count: {
              type: "number",
              minimum: 2,
              maximum: 6,
              description: "Number of campaign/bonus offers"
            },
            focus: {
              type: "string",
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance"],
              description: "Campaign focus area"
            },
            types: {
              type: "array",
              description: "Types of campaigns to feature",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "string",
                enum: ["welcome_bonus", "first_deposit_bonus", "reload_bonus", "cashback_bonus", "free_bets", "accumulator_bonus", "vip_program", "loyalty_rewards", "daily_promotions", "weekly_promotions", "monthly_promotions", "tournament_bonuses", "referral_bonus", "mobile_bonus"]
              }
            }
          },
          required: ["count", "focus", "types"],
          additionalProperties: false
        },
        faq: {
          type: "object",
          description: "FAQ section configuration",
          properties: {
            count: {
              type: "number",
              minimum: 6,
              maximum: 15,
              description: "Number of FAQ items"
            },
            categories: {
              type: "array",
              description: "FAQ categories to cover",
              minItems: 3,
              maxItems: 8,
              items: {
                type: "string",
                enum: ["registration", "account_verification", "deposits", "withdrawals", "payment_methods", "bonuses", "wagering_requirements", "security", "privacy", "mobile_usage", "technical_support", "responsible_gambling", "licensing", "general"]
              }
            },
            primary_focus: {
              type: "string",
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance"],
              description: "Primary focus for FAQ content"
            }
          },
          required: ["count", "categories", "primary_focus"],
          additionalProperties: false
        },
        content_emphasis: {
          type: "object",
          description: "Overall content strategy",
          properties: {
            primary_focus: {
              type: "string",
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance"],
              description: "Main content focus throughout site"
            },
            secondary_focus: {
              type: "string",
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance"],
              description: "Secondary content focus"
            },
            tone: {
              type: "string",
              enum: ["trustworthy_professional", "exciting_dynamic", "secure_reliable", "user_friendly_approachable"],
              description: "Content tone and style"
            }
          },
          required: ["primary_focus", "secondary_focus", "tone"],
          additionalProperties: false
        }
      },
      required: ["sections", "features", "campaigns", "faq", "content_emphasis"],
      additionalProperties: false
    },
    seo_strategy: {
      type: "object",
      description: "SEO optimization strategy",
      properties: {
        title_focus: {
          type: "string",
          enum: ["primary_keyword", "security_and_reliability", "bonuses_and_promotions", "mobile_experience", "sports_betting", "casino_games", "trust_indicators", "user_benefits", "competitive_advantages"],
          description: "Primary focus for title tags"
        },
        description_focus: {
          type: "string",
          enum: ["primary_keyword", "security_and_reliability", "bonuses_and_promotions", "mobile_experience", "sports_betting", "casino_games", "trust_indicators", "user_benefits", "competitive_advantages"],
          description: "Primary focus for meta descriptions"
        },
        schema_priority: {
          type: "array",
          description: "Structured data priority order",
          items: {
            type: "string",
            enum: ["FAQ", "Organization", "BreadcrumbList", "WebSite", "Review"]
          }
        }
      },
      required: ["title_focus", "description_focus", "schema_priority"],
      additionalProperties: false
    },
    unique_elements: {
      type: "array",
      description: "Special unique elements to make the site stand out",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "string",
        enum: ["security_certification_showcase", "mobile_app_download_section", "live_chat_integration", "odds_comparison_tool", "betting_calculator", "live_scores_widget", "game_demo_section", "winner_testimonials", "payment_security_badges", "regulatory_compliance_section", "responsible_gambling_tools", "social_proof_elements", "trust_pilot_reviews", "industry_awards_showcase"]
      }
    },
    reasoning: {
      type: "object",
      description: "AI reasoning for structure decisions",
      properties: {
        structure_rationale: {
          type: "string",
          maxLength: 200,
          description: "Brief explanation of why this structure was chosen"
        },
        focus_justification: {
          type: "string",
          maxLength: 200,
          description: "Why these focus areas match the business requirements"
        },
        differentiation_strategy: {
          type: "string",
          maxLength: 200,
          description: "How this structure will differentiate from competitors"
        }
      },
      required: ["structure_rationale", "focus_justification", "differentiation_strategy"],
      additionalProperties: false
    }
  },
  required: ["structure", "seo_strategy", "unique_elements", "reasoning"],
  additionalProperties: false
};

module.exports = {
  GamblingWebsiteStructure,
  GamblingWebsiteStructureSchema,
  SectionType,
  FeatureType, 
  CampaignType,
  FAQCategory,
  ContentFocus,
  SEOFocus,
  UniqueElement
};
