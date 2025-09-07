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
  'licensing',
  // New diverse sections
  'success_stories',
  'statistics_showcase',
  'expert_analysis',
  'trending_games',
  'community_feed',
  'tournament_calendar',
  'odds_comparison',
  'live_results',
  'betting_tips',
  'news_updates',
  'social_proof',
  'achievements_gallery',
  'interactive_demo',
  'quick_bet_panel',
  'loyalty_tiers',
  'referral_program',
  'brand_story',
  'innovation_showcase',
  'seasonal_promotions',
  'regional_highlights'
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
  'game_providers',
  // New diverse features
  'ai_powered_recommendations',
  'voice_betting',
  'augmented_reality_games',
  'blockchain_transparency',
  'biometric_security',
  'instant_kyc_verification',
  'social_betting_features',
  'predictive_analytics',
  'custom_betting_interface',
  'multi_language_support',
  'adaptive_odds_display',
  'automated_cashout_rules',
  'betting_history_analysis',
  'risk_management_tools',
  'tournament_creation',
  'leaderboard_systems',
  'achievement_badges',
  'personalized_dashboard',
  'cross_platform_sync',
  'offline_mode_support',
  'smart_notifications',
  'weather_integration',
  'news_feed_betting',
  'celebrity_tips_integration'
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
  'mobile_bonus',
  // New diverse campaigns
  'birthday_bonus',
  'anniversary_rewards',
  'seasonal_campaigns',
  'weather_based_bets',
  'social_media_challenges',
  'prediction_contests',
  'charity_betting_events',
  'celebrity_match_bonuses',
  'early_bird_specials',
  'late_night_bonuses',
  'weekend_warriors',
  'milestone_achievements',
  'comeback_bonuses',
  'perfect_week_rewards',
  'community_jackpots',
  'regional_pride_bets',
  'underdog_support_bonus',
  'streak_breaker_rewards',
  'new_game_launch_bonus',
  'loyalty_tier_upgrades',
  'friend_challenge_bets',
  'expert_tipster_rewards',
  'lucky_number_bonuses',
  'time_limited_flash_deals'
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
  'regulatory_compliance',
  // New diverse focus areas
  'innovation_technology',
  'community_engagement',
  'expert_insights',
  'entertainment_value',
  'social_responsibility',
  'educational_content',
  'personalization',
  'gamification',
  'sustainability',
  'cultural_relevance',
  'accessibility',
  'transparency',
  'performance_optimization',
  'data_analytics',
  'lifestyle_integration'
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
  'industry_awards_showcase',
  // New unique elements for diversity
  'interactive_game_showcase',
  'virtual_reality_preview',
  'ai_betting_assistant',
  'personalized_odds_feed',
  'social_betting_wall',
  'expert_prediction_panel',
  'live_event_tracker',
  'achievement_progress_bar',
  'community_leaderboards',
  'weather_based_betting',
  'celebrity_endorsements',
  'cultural_celebration_themes',
  'seasonal_design_variants',
  'motivational_quote_carousel',
  'success_story_timeline',
  'brand_mascot_integration',
  'interactive_tutorials',
  'gamified_onboarding',
  'loyalty_point_visualizer',
  'mood_based_recommendations',
  'time_zone_localization',
  'regional_sports_focus',
  'charity_partnership_showcase',
  'environmental_commitment_badge',
  'accessibility_features_highlight',
  'multi_generational_appeal',
  'tech_innovation_spotlight',
  'behind_scenes_content',
  'user_generated_content_feed',
  'predictive_trend_analysis'
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
      tone: z.enum(['trustworthy_professional', 'exciting_dynamic', 'secure_reliable', 'user_friendly_approachable', 'innovative_cutting_edge', 'community_driven', 'luxury_premium', 'fun_entertainment', 'educational_informative', 'culturally_relevant']).describe('Content tone and style'),
      personality: z.enum(['authoritative_expert', 'friendly_guide', 'tech_innovator', 'community_builder', 'trusted_advisor', 'entertainment_host', 'performance_coach', 'cultural_ambassador']).describe('Brand personality'),
      visual_style: z.enum(['modern_minimalist', 'bold_vibrant', 'classic_elegant', 'tech_futuristic', 'warm_inviting', 'premium_luxury', 'playful_colorful', 'dark_professional']).describe('Visual design direction')
    }).describe('Overall content strategy'),

    diversity_factors: z.object({
      cultural_adaptation: z.enum(['local_sports_focus', 'regional_payment_methods', 'cultural_celebrations', 'local_language_nuances', 'traditional_games_integration']).describe('Cultural localization elements'),
      innovation_level: z.enum(['conservative_traditional', 'moderate_evolution', 'progressive_innovation', 'cutting_edge_experimental']).describe('Technology and feature innovation level'),
      target_demographic: z.enum(['young_tech_savvy', 'experienced_bettors', 'casual_entertainment', 'professional_traders', 'social_community', 'mobile_first_users']).describe('Primary target audience'),
      engagement_style: z.enum(['information_heavy', 'visual_storytelling', 'interactive_experience', 'social_community', 'gamified_journey', 'personalized_approach']).describe('User engagement approach')
    }).describe('Factors that make this site unique and diverse')
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
                enum: ["hero", "about", "features", "security", "mobile", "sports_betting", "casino_games", "live_betting", "campaigns", "bonuses", "vip_program", "payment_methods", "faq", "testimonials", "reviews", "contact", "responsible_gambling", "licensing", "success_stories", "statistics_showcase", "expert_analysis", "trending_games", "community_feed", "tournament_calendar", "odds_comparison", "live_results", "betting_tips", "news_updates", "social_proof", "achievements_gallery", "interactive_demo", "quick_bet_panel", "loyalty_tiers", "referral_program", "brand_story", "innovation_showcase", "seasonal_promotions", "regional_highlights"],
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
                enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance", "innovation_technology", "community_engagement", "expert_insights", "entertainment_value", "social_responsibility", "educational_content", "personalization", "gamification", "sustainability", "cultural_relevance", "accessibility", "transparency", "performance_optimization", "data_analytics", "lifestyle_integration"],
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
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance", "innovation_technology", "community_engagement", "expert_insights", "entertainment_value", "social_responsibility", "educational_content", "personalization", "gamification", "sustainability", "cultural_relevance", "accessibility", "transparency", "performance_optimization", "data_analytics", "lifestyle_integration"],
              description: "Primary focus for feature selection"
            },
            types: {
              type: "array",
              description: "Specific feature types to include",
              minItems: 3,
              maxItems: 8,
              items: {
                type: "string",
                enum: ["ssl_security", "data_encryption", "license_verification", "mobile_optimization", "mobile_app", "responsive_design", "payment_security", "fast_withdrawals", "multiple_payment_methods", "customer_support", "live_chat", "24_7_support", "odds_quality", "live_streaming", "cash_out", "in_play_betting", "casino_variety", "live_dealers", "game_providers", "ai_powered_recommendations", "voice_betting", "augmented_reality_games", "blockchain_transparency", "biometric_security", "instant_kyc_verification", "social_betting_features", "predictive_analytics", "custom_betting_interface", "multi_language_support", "adaptive_odds_display", "automated_cashout_rules", "betting_history_analysis", "risk_management_tools", "tournament_creation", "leaderboard_systems", "achievement_badges", "personalized_dashboard", "cross_platform_sync", "offline_mode_support", "smart_notifications", "weather_integration", "news_feed_betting", "celebrity_tips_integration"]
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
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance", "innovation_technology", "community_engagement", "expert_insights", "entertainment_value", "social_responsibility", "educational_content", "personalization", "gamification", "sustainability", "cultural_relevance", "accessibility", "transparency", "performance_optimization", "data_analytics", "lifestyle_integration"],
              description: "Campaign focus area"
            },
            types: {
              type: "array",
              description: "Types of campaigns to feature",
              minItems: 2,
              maxItems: 6,
              items: {
                type: "string",
                enum: ["welcome_bonus", "first_deposit_bonus", "reload_bonus", "cashback_bonus", "free_bets", "accumulator_bonus", "vip_program", "loyalty_rewards", "daily_promotions", "weekly_promotions", "monthly_promotions", "tournament_bonuses", "referral_bonus", "mobile_bonus", "birthday_bonus", "anniversary_rewards", "seasonal_campaigns", "weather_based_bets", "social_media_challenges", "prediction_contests", "charity_betting_events", "celebrity_match_bonuses", "early_bird_specials", "late_night_bonuses", "weekend_warriors", "milestone_achievements", "comeback_bonuses", "perfect_week_rewards", "community_jackpots", "regional_pride_bets", "underdog_support_bonus", "streak_breaker_rewards", "new_game_launch_bonus", "loyalty_tier_upgrades", "friend_challenge_bets", "expert_tipster_rewards", "lucky_number_bonuses", "time_limited_flash_deals"]
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
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance", "innovation_technology", "community_engagement", "expert_insights", "entertainment_value", "social_responsibility", "educational_content", "personalization", "gamification", "sustainability", "cultural_relevance", "accessibility", "transparency", "performance_optimization", "data_analytics", "lifestyle_integration"],
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
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance", "innovation_technology", "community_engagement", "expert_insights", "entertainment_value", "social_responsibility", "educational_content", "personalization", "gamification", "sustainability", "cultural_relevance", "accessibility", "transparency", "performance_optimization", "data_analytics", "lifestyle_integration"],
              description: "Main content focus throughout site"
            },
            secondary_focus: {
              type: "string",
              enum: ["security_trust", "mobile_experience", "bonus_rewards", "sports_betting", "casino_gaming", "customer_service", "payment_convenience", "live_betting", "user_experience", "regulatory_compliance", "innovation_technology", "community_engagement", "expert_insights", "entertainment_value", "social_responsibility", "educational_content", "personalization", "gamification", "sustainability", "cultural_relevance", "accessibility", "transparency", "performance_optimization", "data_analytics", "lifestyle_integration"],
              description: "Secondary content focus"
            },
            tone: {
              type: "string",
              enum: ["trustworthy_professional", "exciting_dynamic", "secure_reliable", "user_friendly_approachable", "innovative_cutting_edge", "community_driven", "luxury_premium", "fun_entertainment", "educational_informative", "culturally_relevant"],
              description: "Content tone and style"
            },
            personality: {
              type: "string",
              enum: ["authoritative_expert", "friendly_guide", "tech_innovator", "community_builder", "trusted_advisor", "entertainment_host", "performance_coach", "cultural_ambassador"],
              description: "Brand personality"
            },
            visual_style: {
              type: "string",
              enum: ["modern_minimalist", "bold_vibrant", "classic_elegant", "tech_futuristic", "warm_inviting", "premium_luxury", "playful_colorful", "dark_professional"],
              description: "Visual design direction"
            }
          },
          required: ["primary_focus", "secondary_focus", "tone", "personality", "visual_style"],
          additionalProperties: false
        },
        diversity_factors: {
          type: "object",
          description: "Factors that make this site unique and diverse",
          properties: {
            cultural_adaptation: {
              type: "string",
              enum: ["local_sports_focus", "regional_payment_methods", "cultural_celebrations", "local_language_nuances", "traditional_games_integration"],
              description: "Cultural localization elements"
            },
            innovation_level: {
              type: "string",
              enum: ["conservative_traditional", "moderate_evolution", "progressive_innovation", "cutting_edge_experimental"],
              description: "Technology and feature innovation level"
            },
            target_demographic: {
              type: "string",
              enum: ["young_tech_savvy", "experienced_bettors", "casual_entertainment", "professional_traders", "social_community", "mobile_first_users"],
              description: "Primary target audience"
            },
            engagement_style: {
              type: "string",
              enum: ["information_heavy", "visual_storytelling", "interactive_experience", "social_community", "gamified_journey", "personalized_approach"],
              description: "User engagement approach"
            }
          },
          required: ["cultural_adaptation", "innovation_level", "target_demographic", "engagement_style"],
          additionalProperties: false
        }
      },
      required: ["sections", "features", "campaigns", "faq", "content_emphasis", "diversity_factors"],
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
        enum: ["security_certification_showcase", "mobile_app_download_section", "live_chat_integration", "odds_comparison_tool", "betting_calculator", "live_scores_widget", "game_demo_section", "winner_testimonials", "payment_security_badges", "regulatory_compliance_section", "responsible_gambling_tools", "social_proof_elements", "trust_pilot_reviews", "industry_awards_showcase", "interactive_game_showcase", "virtual_reality_preview", "ai_betting_assistant", "personalized_odds_feed", "social_betting_wall", "expert_prediction_panel", "live_event_tracker", "achievement_progress_bar", "community_leaderboards", "weather_based_betting", "celebrity_endorsements", "cultural_celebration_themes", "seasonal_design_variants", "motivational_quote_carousel", "success_story_timeline", "brand_mascot_integration", "interactive_tutorials", "gamified_onboarding", "loyalty_point_visualizer", "mood_based_recommendations", "time_zone_localization", "regional_sports_focus", "charity_partnership_showcase", "environmental_commitment_badge", "accessibility_features_highlight", "multi_generational_appeal", "tech_innovation_spotlight", "behind_scenes_content", "user_generated_content_feed", "predictive_trend_analysis"]
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
