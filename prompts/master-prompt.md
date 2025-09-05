# Master Prompt for Complete Gambling Site Generation

## System Overview

This is a comprehensive prompt system for generating complete, high-quality gambling/betting websites that meet Google's E-E-A-T standards for YMYL content. The system generates both textual content and visual assets using OpenAI's GPT and DALL-E models.

## Input Parameters

The following parameters must be provided:

```javascript
{
  "primary_keyword": "string", // Main SEO keyword (e.g., "Paribahis")
  "canonical_url": "string",   // Primary domain (e.g., "https://example.com")
  "hreflang_urls": {           // Multi-language URLs
    "tr": "string",
    "en": "string",
    // ... other languages
  },
  "secondary_keywords": ["string"], // Related keywords array
  "focus_areas": ["string"],   // Specific focus areas
  "brand_name": "string",      // Site/brand name
  "color_scheme": {            // Custom colors if needed
    "primary": "string",
    "secondary": "string",
    "accent": "string"
  }
}
```

## Phase 1: Content Strategy and Research

### GPT-5 Research Prompt

```
As an expert SEO strategist for YMYL gambling sites, analyze the provided keywords and generate a comprehensive content strategy that will achieve high Google Quality Scores.

Input Keywords: {PRIMARY_KEYWORD}, {SECONDARY_KEYWORDS}
Target Domain: {CANONICAL_URL}
Language: Turkish
Industry: Online Betting/Gambling

Research and determine:

1. **Content Architecture**: What sections are mandatory for high E-E-A-T scores in gambling
2. **Keyword Strategy**: How to naturally integrate keywords for maximum SEO impact
3. **User Intent**: What Turkish users expect from a {PRIMARY_KEYWORD} site
4. **Compliance Requirements**: Turkish gambling regulations and advertising standards
5. **Trust Signals**: What elements build credibility for gambling sites
6. **Technical SEO**: What structured data and meta elements are crucial

Provide a detailed content strategy that includes:
- Section priorities and purposes
- Content depth recommendations
- Trust-building elements
- Compliance considerations
- SEO optimization tactics

Format your response as a strategic plan with specific recommendations for each content section.
```

## Phase 2: Comprehensive Content Generation

### Main Content Generation Prompt

```
Based on the content strategy, generate complete, high-quality Turkish content for a gambling website about {PRIMARY_KEYWORD}.

CONTEXT:
- Domain: {CANONICAL_URL}
- Primary Keyword: {PRIMARY_KEYWORD}
- Secondary Keywords: {SECONDARY_KEYWORDS}
- Target Audience: Turkish adults 18+ interested in online betting
- Goal: Achieve high Google E-E-A-T scores for YMYL content

REQUIREMENTS:

### SEO Meta Content
Generate optimized meta tags:
- Title (50-60 chars): Include {PRIMARY_KEYWORD} + compelling CTA
- Description (150-160 chars): Include keywords + benefits + CTA
- Keywords (15-20): Primary + secondary + semantic variations

### Hero Section Content
- Headline: Powerful, keyword-rich, trust-building
- Subtitle: Value proposition + security emphasis  
- Description: 2-3 sentences highlighting key benefits
- CTA Button: Action-oriented text

### About Section (300-400 words)
- Company credibility and expertise
- Industry experience and licensing
- Security and safety commitments
- Responsible gambling stance
- User-focused mission

### Features Section (4-6 features)
Each feature needs:
- Title (keyword-rich)
- Description (80-100 words)
- Trust/security angle

Focus areas:
1. Security & Licensing
2. Mobile Compatibility  
3. Payment Options
4. Customer Support
5. Odds Quality
6. User Experience

### Campaigns Section (3-4 campaigns)
Each campaign needs:
- Title
- Description (100-120 words)
- Terms transparency
- Responsible gambling disclaimer

Types:
1. Welcome Bonus
2. Weekly Cashback
3. VIP Program
4. Referral Bonus

### FAQ Section (10-12 questions)
Cover these categories:
- Registration & Verification
- Payments & Withdrawals
- Security & Privacy
- Mobile & Technical
- Bonuses & Promotions
- Customer Support
- Responsible Gambling

Each answer: 120-150 words, detailed, helpful

### Contact Section
- Contact form labels and placeholders
- Support channel descriptions
- Response time commitments
- Professional service promises

### Structured Data
Generate valid JSON-LD for:
1. FAQ Schema
2. BreadcrumbList Schema
3. Organization Schema
4. Website Schema

### Additional Trust Elements
- Responsible gambling resources
- Age verification notices
- Security certifications mentions
- Customer protection policies

OUTPUT FORMAT: Return as structured JSON with all content sections clearly organized.

QUALITY STANDARDS:
- Natural Turkish language
- Professional, trustworthy tone
- E-E-A-T principle demonstration
- Regulatory compliance
- User safety emphasis
- SEO optimization without over-optimization
```

## Phase 3: Image Asset Generation

### Image Generation Workflow

```
Generate a complete set of professional images for a Turkish gambling website about {PRIMARY_KEYWORD}.

BRAND GUIDELINES:
- Color Palette: Dark blue (#0d1421), Gold (#f5c542), White (#ffffff)
- Style: Professional, modern, trustworthy
- Audience: Turkish adults 18+
- Industry: Online betting/gambling

REQUIRED IMAGES:

1. HERO BACKGROUND (1920x1080)
Prompt: "Professional hero background for Turkish betting site about {PRIMARY_KEYWORD}. Modern geometric patterns, dark blue and gold gradient, sophisticated lighting, no text, trustworthy appearance, suitable for 18+ gambling content, high-end aesthetic, 16:9 ratio"

2. SECURITY FEATURE ICON (512x512)
Prompt: "Minimalist security icon for gambling website. Shield with lock symbol, blue and gold colors, professional design, clean lines, no text, web-ready quality, 1:1 ratio"

3. MOBILE COMPATIBILITY ICON (512x512)  
Prompt: "Modern mobile compatibility icon for betting platform. Smartphone with responsive design elements, blue and gold palette, clean minimalist style, professional appearance, 1:1 ratio"

4. CUSTOMER SUPPORT ICON (512x512)
Prompt: "Professional customer support icon for gambling site. Headset or chat bubble symbol, trustworthy design, blue and gold colors, clean modern aesthetic, 1:1 ratio"

5. PAYMENT SECURITY ICON (512x512)
Prompt: "Secure payment icon for betting website. Credit card with security shield, professional blue and gold design, minimalist style, trustworthy appearance, 1:1 ratio"

6. WELCOME BONUS ILLUSTRATION (800x600)
Prompt: "Professional welcome bonus illustration for Turkish betting site about {PRIMARY_KEYWORD}. Gift or bonus symbols, elegant gold and blue design, modern aesthetic, suitable for 18+ gambling, no specific amounts, 4:3 ratio"

7. VIP PROGRAM ILLUSTRATION (800x600)
Prompt: "Luxury VIP program illustration for betting platform. Premium symbols, sophisticated gold and dark blue palette, exclusive appearance, modern design, suitable for adult gambling content, 4:3 ratio"

8. FAQ SUPPORT GRAPHIC (400x300)
Prompt: "Helpful FAQ section illustration for betting website. Question mark or help symbols, friendly but professional appearance, blue and gold scheme, supportive design, 4:3 ratio"

9. CONTACT SUPPORT IMAGE (600x400)
Prompt: "Professional customer service illustration for Turkish betting site. Communication symbols, trustworthy appearance, modern blue and gold design, friendly but professional, 3:2 ratio"

10. FAVICON (32x32, 16x16)
Prompt: "Simple favicon for {PRIMARY_KEYWORD} betting site. Minimalist logo or symbol, blue and gold colors, clear at small sizes, professional appearance, square format"

IMAGE SPECIFICATIONS:
- Format: PNG for icons/graphics, JPG for backgrounds
- Quality: High resolution, web-optimized
- Size: Under 500KB each
- Color: sRGB color profile
- Style: Consistent brand aesthetic

NAMING CONVENTION:
- hero-bg-{primary_keyword}.jpg
- icon-security-{primary_keyword}.png
- icon-mobile-{primary_keyword}.png
- icon-support-{primary_keyword}.png
- icon-payment-{primary_keyword}.png
- campaign-welcome-{primary_keyword}.jpg
- campaign-vip-{primary_keyword}.jpg
- faq-support-{primary_keyword}.png
- contact-support-{primary_keyword}.jpg
- favicon-{primary_keyword}.png

Generate all images maintaining consistent quality and brand coherence.
```

## Phase 4: HTML Structure Generation

### HTML Template Prompt

```
Generate a complete, production-ready HTML file based on the provided content and image specifications.

INPUT DATA:
- Content JSON: {GENERATED_CONTENT}
- Image List: {GENERATED_IMAGES}
- Domain: {CANONICAL_URL}
- Hreflang URLs: {HREFLANG_URLS}

REQUIREMENTS:

### HTML Structure
- Valid HTML5 DOCTYPE
- Semantic HTML elements
- Accessibility features (ARIA labels, alt text)
- Mobile-first responsive design
- Fast loading optimization

### SEO Implementation
- Title tag with generated content
- Meta description and keywords
- Open Graph tags (title, description, url, type, locale)
- Twitter Card tags
- Canonical URL
- Hreflang tags for all provided languages
- Generated structured data (JSON-LD)

### CSS Styling
Base the design on the provided examples but modernize:
- CSS Grid and Flexbox layouts
- Modern color palette (blue/gold theme)
- Responsive breakpoints
- Smooth animations and transitions
- Professional typography
- Mobile-optimized design

### JavaScript Functionality
- FAQ accordion functionality
- Smooth scrolling navigation
- Form validation
- Mobile menu toggle
- Basic analytics setup

### Performance Optimization
- Optimized CSS (inline critical CSS)
- Efficient image loading
- Minified code structure
- Fast rendering techniques

### Compliance Features
- Age verification notice
- Responsible gambling disclaimers
- Cookie policy placeholder
- Terms of service links
- Privacy policy references

OUTPUT: Complete HTML file ready for production deployment.
```

## Phase 5: Asset Organization

### File Structure Generation

Create the following folder structure:

```
{domain-name}/
├── index.html
├── assets/
│   ├── images/
│   │   ├── hero-bg-{keyword}.jpg
│   │   ├── icon-security-{keyword}.png
│   │   ├── icon-mobile-{keyword}.png
│   │   ├── icon-support-{keyword}.png
│   │   ├── icon-payment-{keyword}.png
│   │   ├── campaign-welcome-{keyword}.jpg
│   │   ├── campaign-vip-{keyword}.jpg
│   │   ├── faq-support-{keyword}.png
│   │   ├── contact-support-{keyword}.jpg
│   │   └── favicon-{keyword}.png
│   ├── css/
│   │   └── styles.css (if external CSS needed)
│   └── js/
│       └── scripts.js (if external JS needed)
├── robots.txt
├── sitemap.xml
└── manifest.json
```

## Quality Assurance Checklist

### Content Quality
- [ ] All content in natural Turkish
- [ ] E-E-A-T principles demonstrated
- [ ] Keywords naturally integrated
- [ ] Responsible gambling elements included
- [ ] Professional, trustworthy tone
- [ ] Factual accuracy maintained

### Technical Quality  
- [ ] Valid HTML5 structure
- [ ] Responsive design implemented
- [ ] Fast loading optimization
- [ ] SEO elements properly configured
- [ ] Accessibility features included
- [ ] Cross-browser compatibility

### Compliance
- [ ] Age restriction notices (18+)
- [ ] Responsible gambling disclaimers
- [ ] Turkish regulation compliance
- [ ] Privacy and data protection
- [ ] Truth in advertising standards
- [ ] No misleading claims

### Image Quality
- [ ] Professional appearance
- [ ] Consistent brand aesthetic
- [ ] Proper file formats and sizes
- [ ] Web-optimized compression
- [ ] Appropriate for target audience
- [ ] Culturally sensitive content

This comprehensive prompt system ensures the generation of complete, high-quality gambling websites that meet all technical, content, and compliance requirements for success in Turkish markets.
