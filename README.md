# HTML Generator for Gambling Sites

AI-powered HTML generator that creates high-quality, SEO-optimized gambling/betting websites using OpenAI's advanced models. Features a sophisticated 6-service modular architecture with dynamic structure generation, designed specifically for Turkish gambling sites with E-E-A-T compliance for YMYL content.

## 🚀 Quick Installation & Setup

### **Prerequisites**
- Node.js 18.0.0 or higher
- OpenAI API key with access to GPT-5, GPT-5-Nano, and GPT-Image-1 models
- Verified OpenAI organization (required for GPT-Image-1 model)

### **Installation**

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd index-html-generator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your OpenAI API key**:
   ```bash
   # Option 1: Environment variable (recommended)
   export OPENAI_API_KEY="sk-proj-your-api-key-here"
   
   # Option 2: Create .env file
   echo "OPENAI_API_KEY=sk-proj-your-api-key-here" > .env
   ```

4. **Verify installation**:
   ```bash
   node cli.js status
   ```

5. **Generate your first site**:
   ```bash
   node cli.js generate \
     --primary-keyword "YourBrand" \
     --canonical-url "https://yourdomain.com" \
     --brand-name "Your Brand Name"
   ```

### **Quick Start Example**
```bash
# Generate a complete Turkish gambling site
node cli-api.js generate \
  --primary-keyword "Paribahis" \
  --canonical-url "https://example.com" \
  --hreflang-urls '{"tr":"https://tr.example.com","en":"https://en.example.com"}' \
  --secondary-keywords "bahis,casino,spor" \
  --focus-areas "güvenlik,bonus,mobil" \
  --brand-name "Paribahis Resmi"
```

**✅ Result**: A complete, self-contained HTML file (150-200KB) ready for deployment!

---

## 🏗️ Architecture & Workflow

The HTML generator uses an **Enhanced AI-Powered 6-Step Workflow** with dynamic structure generation that ensures each site is unique, optimized, and contextually relevant:

### **Enhanced Generation Workflow:**

```
Step 0: Dynamic Structure Generation (GPT-5-Nano + Structured Output)
    ↓
Step 1: HTML Content Generation (GPT-5)
    ↓
Step 2: HTML Parsing & Image Reference Analysis
    ↓
Step 3: AI-Contextual Image Prompt Generation (GPT-5)
    ↓
Step 4: Intelligent Image Generation (GPT-Image-1)
    ↓
Step 5: Self-contained HTML Assembly & Additional Files
```

### **Detailed Process:**

0. **📐 Dynamic HTML Structure Planning**
   - Uses **GPT-5-Nano** with **structured output** for efficient planning
   - Generates dynamic HTML structure based on user requirements
   - Creates contextual section plans with **JSON Schema validation**
   - Optimized for speed and cost-effectiveness

1. **🤖 AI-Enhanced HTML Content Generation**
   - Uses **GPT-5** model (`gpt-5-2025-08-07`) with dynamic structure input
   - Generates contextually relevant content based on structure plan
   - Includes all SEO elements, hreflang tags, and E-E-A-T compliance
   - Adaptive content length and focus based on requirements

2. **🔍 Intelligent HTML Analysis** 
   - Advanced parsing of generated HTML for all image references
   - Identifies `<img>` tags, CSS backgrounds, favicons, and meta icons
   - Creates comprehensive image requirement list
   - Analyzes image context and purpose within HTML structure

3. **🧠 AI-Contextual Image Prompt Generation**
   - Uses **GPT-5** to analyze HTML content and generate contextual prompts
   - Creates specific, relevant prompts for each image based on surrounding content
   - Generates professional gambling industry-appropriate descriptions
   - Ensures brand consistency and visual coherence

4. **🎨 Smart Image Generation with Validation**
   - Uses **GPT-Image-1** model with AI-generated contextual prompts
   - **Automatic size validation** and correction for OpenAI API compatibility
   - Intelligent fallback to **enhanced WebP placeholders** when needed
   - Optimized format conversion and quality management

5. **📦 Self-contained Assembly & Deployment Package**
   - Embeds all images as **base64 data URLs** for zero-dependency deployment
   - Creates comprehensive deployment package with SEO files
   - Generates `robots.txt`, `sitemap.xml`, `manifest.json`
   - Optimizes final file size while maintaining quality

## 🚀 Key Features

### **Advanced AI Architecture**
- **6-Service Modular Design** with specialized AI workflows
- **GPT-5-Nano** for efficient structure planning with structured output
- **GPT-5** (`gpt-5-2025-08-07`) for premium content generation
- **GPT-Image-1** with AI-contextual prompt generation and size validation
- **Dynamic workflow** that adapts to each site's unique requirements

### **Intelligent Structure Generation**
- **Dynamic HTML planning** based on user requirements and industry best practices
- **Structured output** with JSON Schema validation for consistent results
- **Contextual section planning** optimized for gambling industry needs
- **Adaptive content architecture** that scales with complexity

### **AI-Enhanced Image Workflow**
- **Context-aware prompt generation** using GPT-5 analysis of HTML content
- **Automatic size validation** and correction for OpenAI API compatibility
- **Smart placeholder fallbacks** with enhanced WebP quality
- **Professional gambling industry** visual standards and branding

### **Self-contained Deployment**
- **Single HTML file** with all assets embedded as base64 (typically 150-200KB)
- **Zero external dependencies** - deploy anywhere instantly
- **WebP optimization** for maximum performance and quality
- **Offline capable** - works without internet after generation

### **Enterprise-Grade SEO**
- **Complete hreflang implementation** for international SEO
- **Structured data** with JSON-LD for enhanced search visibility
- **E-E-A-T compliance** specifically designed for YMYL (Your Money or Your Life) content
- **Turkish gambling industry** regulations and best practices

### **Developer Experience**
- **Modular service architecture** for easy maintenance and extensibility  
- **Comprehensive error handling** with graceful fallbacks
- **Detailed logging** and progress tracking for debugging
- **CLI interface** with both interactive and command-line modes

## 🎯 Usage Examples

### **Basic Generation:**
```bash
node cli.js generate 
  --primary-keyword "Paribahis" 
  --canonical-url "https://example.com" 
  --api-key sk-...
```

### **With Hreflang URLs:**
```bash
node cli.js generate 
  --primary-keyword "Paribahis" 
  --canonical-url "https://example.com" 
  --hreflang-urls '{"tr":"https://tr.example.com","en":"https://en.example.com","ru":"https://ru.example.com"}' 
  --secondary-keywords "bahis,casino,spor" 
  --focus-areas "güvenlik,bonus,mobil" 
  --brand-name "Paribahis Resmi" 
  --api-key sk-...
```

### **Using Environment Variable:**
```bash
export OPENAI_API_KEY=sk-...
node cli.js generate --primary-keyword "Paribahis" --canonical-url "https://example.com"
```

## ⚡ Enhanced Workflow Advantages

### **🧠 AI-Powered Intelligence**
- **Dynamic structure planning** creates unique layouts for each site
- **Contextual image generation** produces relevant, professional visuals
- **Structured output validation** ensures consistent, high-quality results
- **Adaptive content scaling** based on requirements and complexity

### **🔄 Smart & Efficient**
- **Modular service architecture** allows independent testing and optimization
- **No wasted API calls** - only generates images that are actually needed
- **Intelligent fallbacks** ensure generation completes even if some services fail
- **Cost-optimized model selection** (GPT-5-Nano for structure, GPT-5 for content)

### **📦 Production Ready**
- **Self-contained deployment** requires no server configuration or file management
- **Instant deployment** to any hosting service, CDN, or static hosting platform
- **Zero broken links** - all assets embedded and guaranteed to work
- **Professional output** ready for immediate production use

### **🚀 Performance Optimized**
- **WebP format** provides 25-35% better compression than JPEG/PNG
- **Single HTTP request** loads entire website with embedded assets
- **Base64 embedding** eliminates network latency for images
- **Optimized file sizes** typically 150-200KB for complete sites

### **🔧 Developer Friendly**
- **Atomic operations** - each step can be tested and debugged independently  
- **Comprehensive logging** shows exactly what's happening at each stage
- **Graceful error handling** with detailed error messages and recovery suggestions
- **Extensible architecture** for adding new features and AI models

## Command Line Options

### Generate Command
| Option | Description | Example |
|--------|-------------|---------|
| `-k, --primary-keyword <keyword>` | Primary SEO keyword | `--primary-keyword "Paribahis"` |
| `-u, --canonical-url <url>` | Canonical URL | `--canonical-url "https://example.com"` |
| `-h, --hreflang-urls <json>` | Hreflang URLs (JSON) | `--hreflang-urls '{"tr":"https://tr.example.com"}'` |
| `-s, --secondary-keywords <keywords>` | Secondary keywords (comma-separated) | `--secondary-keywords "bahis,casino"` |
| `-f, --focus-areas <areas>` | Focus areas (comma-separated) | `--focus-areas "güvenlik,bonus"` |
| `-b, --brand-name <name>` | Brand/site name | `--brand-name "Paribahis Resmi"` |
| `-o, --output-dir <dir>` | Output directory | `--output-dir "./custom-output"` |
| `--api-key <key>` | OpenAI API key | `--api-key "sk-..."` |
| `-s, --secondary <keywords>` | Secondary keywords (comma-separated) | `--secondary "bahis,casino"` |
| `-f, --focus <areas>` | Focus areas (comma-separated) | `--focus "Güvenlik,Mobil"` |
| `-b, --brand <name>` | Brand name | `--brand "Paribahis"` |
| `--api-key <key>` | OpenAI API key | `--api-key "sk-..."` |
| `--interactive` | Interactive mode | `--interactive` |

### Other Commands
- `status` - Check system status and connectivity
- `validate` - Validate configuration
- `--help` - Show help information
- `--version` - Show version information

## Output Structure

Generated sites are saved in the `output/` directory with this structure:

```
output/
└── {keyword}-{date}/
    ├── index.html                           # Self-contained HTML file (150-200KB)
    ├── assets/
    │   └── images/
    │       ├── icon-logo-{keyword}.webp     # Brand logo
    │       ├── icon-shield-{keyword}.webp   # Security icons
    │       ├── icon-mobile-{keyword}.webp   # Mobile app icons
    │       ├── campaign-welcome-{keyword}.webp # Promotional banners
    │       ├── campaign-vip-{keyword}.webp  # VIP program graphics
    │       ├── contact-support-{keyword}.webp # Support illustrations
    │       ├── favicon-{keyword}.webp       # Site favicon
    │       └── [dynamic images based on structure]
    ├── robots.txt                           # SEO robots file
    ├── sitemap.xml                          # XML sitemap with hreflang
    └── manifest.json                        # PWA manifest
```

**Note**: All images are embedded as base64 in the HTML file. The `assets/images/` directory contains the original WebP files for reference and potential separate hosting.

## Generated Content

### HTML Features
- ✅ Complete HTML5 structure with embedded CSS and JavaScript
- ✅ **Dynamic section generation** based on AI structure planning
- ✅ Mobile-responsive design with modern CSS Grid and Flexbox
- ✅ **Comprehensive SEO optimization** with structured data
- ✅ Open Graph and Twitter Cards for social sharing
- ✅ **Multi-language hreflang** implementation
- ✅ **Self-contained deployment** with embedded assets
- ✅ Performance optimized with WebP images and minified code

### Dynamic Content Sections
The structure generator creates **adaptive sections** based on user requirements:
- **Hero Section**: Brand-focused headlines with compelling CTAs
- **Security Features**: Trust signals and compliance badges  
- **Mobile Experience**: App promotion and mobile optimization highlights
- **Bonus Campaigns**: Dynamic promotional content and offers
- **Payment Methods**: Secure payment options and certifications
- **Support & Contact**: Multi-channel customer support information
- **FAQ Section**: Contextually relevant gambling industry questions
- **Legal Compliance**: License information and responsible gambling

### Advanced SEO Elements
- **Complete meta tag optimization** (title, description, keywords)
- **Structured data (JSON-LD)** for enhanced search visibility
- **Open Graph and Twitter Card** implementation
- **Canonical URLs and hreflang tags** for international SEO
- **XML sitemap with hreflang entries** for multi-language support
- **Robots.txt optimization** for search engine crawling
- **Performance-optimized loading** with critical CSS inlining

### AI-Generated Images
Images are **contextually generated** based on HTML analysis:
- **Brand logos and icons** (optimized for gambling industry)
- **Security and trust badges** (SSL, licensing, certifications)
- **Mobile app promotion graphics** (iOS/Android app stores)
- **Campaign and bonus banners** (welcome offers, VIP programs)
- **Payment method icons** (credit cards, e-wallets, crypto)
- **Support and contact illustrations** (live chat, phone support)
- **Favicon and touch icons** (multiple sizes for all devices)

## API Usage and Costs

### Model Usage and Token Consumption
- **Structure Generation (GPT-5-Nano)**: ~2,000-4,000 tokens per site
- **HTML Content Generation (GPT-5)**: ~10,000-18,000 tokens per site  
- **Image Prompt Analysis (GPT-5)**: ~8,000-12,000 tokens per site
- **Image Generation (GPT-Image-1)**: 20-40 images per site (varies by structure)

### Performance Optimizations
- **Cost-efficient model selection**: GPT-5-Nano for structure planning
- **Structured output**: Reduces token usage and improves consistency
- **Intelligent image analysis**: Only generates images actually referenced in HTML
- **Rate limiting**: Built-in delays and retry logic for API reliability

### Typical Generation Stats
- **Total tokens**: ~20,000-34,000 per complete site
- **Images generated**: 20-40 contextual images
- **Generation time**: 3-8 minutes depending on complexity
- **Final file size**: 150-200KB self-contained HTML

## Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional (with defaults)
HTML_GENERATOR_OUTPUT_DIR=./output
HTML_GENERATOR_PROMPTS_DIR=./prompts
```

### Config File
Configuration is managed in `config/openai.config.js`:

```javascript
{
  openai: {
    models: {
      structureGenerator: 'gpt-5-nano',     // Efficient structure planning
      contentGenerator: 'gpt-5-2025-08-07', // Premium content generation  
      imageAnalyzer: 'gpt-5-2025-08-07',    // Contextual image prompts
      imageGenerator: 'gpt-image-1'         // AI image generation
    },
    limits: {
      maxTokens: 16000,
      temperature: 0.7
    }
  },
  images: {
    quality: 'hd',
    format: 'webp',
    sizeValidation: true    // Automatic size correction
  },
  generation: {
    structuredOutput: true,  // Use JSON Schema validation
    enhancedWorkflow: true   // Enable 6-step AI workflow
  }
}
```

## Troubleshooting

### Common Issues

1. **Organization Not Verified for GPT-Image-1**
   ```
   ❌ 403 Your organization must be verified to use the model `gpt-image-1`
   ```
   - Visit https://platform.openai.com/settings/organization/general
   - Click "Verify Organization" and wait up to 15 minutes
   - **Fallback**: System automatically creates enhanced WebP placeholders

2. **API Key Invalid or Missing Model Access**
   ```bash
   # Check status and model availability
   node cli.js status --api-key "your-key"
   
   # Ensure key has access to GPT-5, GPT-5-Nano, and GPT-Image-1
   ```

3. **Structured Output Parsing Errors**
   ```
   ⚠️ Multiple response formats detected, using fallback parser
   ```
   - This is normal - system has robust fallback parsing for different API responses
   - No action needed, generation will continue automatically

4. **Image Size Validation Issues**
   ```
   🔧 Invalid size detected, correcting to supported format
   ```
   - System automatically corrects invalid AI-generated sizes
   - Supported sizes: 1024x1024, 1024x1536, 1536x1024

5. **Rate Limiting**
   ```
   ❌ Failed to generate: Rate limit exceeded
   ```
   - Built-in retry logic will handle temporary rate limits
   - For persistent issues, wait a few minutes and retry

6. **Permission Denied**
   ```bash
   # Make CLI executable (Unix/macOS)
   chmod +x cli.js
   ```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=1 node cli.js generate --interactive
```

## Development

### Project Structure
```
index-html-generator/
├── cli.js                           # Command line interface
├── cli-new.js                       # Enhanced CLI with new workflow
├── package.json                     # Dependencies and scripts
├── config/
│   └── openai.config.js            # AI model configuration
├── services/                        # Modular AI service architecture
│   ├── structure-generator.service.js  # GPT-5-Nano structure planning
│   ├── content-generator.service.js    # GPT-5 HTML generation
│   ├── image-analyzer.service.js       # GPT-5 image prompt analysis
│   ├── image-generator.service.js      # GPT-Image-1 generation
│   ├── html-combiner.service.js        # Self-contained HTML assembly
│   └── file-generator.service.js       # SEO files and deployment package
├── schemas/
│   └── structure.schema.js          # JSON Schema for structured output
├── prompts/
│   ├── structure-generation-prompt.md  # Dynamic structure prompts
│   ├── content-generation-prompt.md    # HTML content prompts
│   ├── image-analysis-prompt.md        # Contextual image analysis
│   └── image-generation-prompt.md      # AI image generation prompts
└── output/                          # Generated sites directory
```

### Adding Custom Features
1. **Modify AI prompts** in the `prompts/` directory for different content styles
2. **Update JSON Schema** in `schemas/structure.schema.js` for new structure elements  
3. **Extend services** to add new AI models or generation steps
4. **Test changes** with `node cli.js validate`

### Service Architecture
Each service is independent and can be:
- **Tested individually** for debugging specific generation steps
- **Extended** with new AI models or generation logic
- **Replaced** with alternative implementations
- **Monitored** with detailed logging and error tracking

## Examples

### Turkish Betting Site
```bash
node cli.js generate \
  --keyword "Paribahis" \
  --url "https://paribahis.com" \
  --secondary "paribahis giriş,paribahis kayıt,bahis" \
  --focus "Güvenlik,Mobil Uyum,Canlı Destek" \
  --brand "Paribahis"
```

### Casino Site
```bash
node cli.js generate \
  --keyword "Casino Metropol" \
  --url "https://casinometropol.com" \
  --secondary "casino,slot,poker" \
  --focus "Casino Oyunları,Bonuslar,VIP Program"
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Validate your configuration with `node cli.js validate`
3. Check system status with `node cli.js status`

## Changelog

### v2.0.0 - Enhanced AI Workflow
- **6-Service Modular Architecture** with specialized AI workflows
- **Dynamic Structure Generation** using GPT-5-Nano with structured output
- **AI-Contextual Image Prompts** generated by GPT-5 analysis
- **Automatic Size Validation** for OpenAI API compatibility
- **Enhanced Error Handling** with graceful fallbacks
- **Self-contained Deployment** with embedded base64 assets
- **Comprehensive Logging** and progress tracking

### v1.0.0 - Initial Release
- GPT-5 content generation
- Basic image generation workflow
- Complete SEO optimization
- Turkish gambling site specialization
- CLI interface with interactive mode
