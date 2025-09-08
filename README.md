# HTML Generator for Gambling Sites

AI-powered HTML generator that creates high-quality, SEO-optimized gambling/betting websites using OpenAI's GPT-5 model. Features a sophisticated service-based modular architecture with dynamic structure generation and optional image generation, designed specifically for Turkish gambling sites with E-E-A-T compliance for YMYL content.

## 🚀 Quick Installation & Setup

### **Prerequisites**
- Node.js 18.0.0 or higher
- OpenAI API key with access to GPT-5 model (gpt-5-2025-08-07)
- DALL-E 3 model access for image generation (when using --need-images flag)

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
   node cli-api.js generate \
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

The HTML generator uses an **Enhanced AI-Powered Service Architecture** with dynamic structure generation that ensures each site is unique, optimized, and contextually relevant:

### **Generation Workflow:**

```
Step 1: Input Processing & Validation
    ↓
Step 2: Dynamic Structure Generation (GPT-5 + JSON Schema)
    ↓
Step 3: HTML Content Generation (GPT-5 with dynamic prompts)
    ↓
Step 4: Image Reference Analysis (if --need-images flag used)
    ↓
Step 5: Image Prompt Generation (GPT-5)
    ↓
Step 6: Image Generation (DALL-E 3)
    ↓
Step 7: HTML Assembly & File Generation
```

### **Detailed Process:**

1. **� Input Processing & Validation**
   - Validates all input parameters and API keys
   - Processes and normalizes user requirements
   - Sets up output directories and logging levels
   - Handles the `--need-images` flag for workflow control

2. **�📐 Dynamic HTML Structure Planning**
   - Uses **GPT-5** model (`gpt-5-2025-08-07`) for intelligent structure planning
   - Generates dynamic HTML structure based on user requirements
   - Creates contextual section plans with **JSON Schema validation**
   - Optimized layouts for gambling industry best practices

3. **🤖 AI-Enhanced HTML Content Generation**
   - Uses **GPT-5** model with dynamic structure input
   - Selects appropriate prompt template based on `--need-images` flag
   - Generates contextually relevant content with full SEO optimization
   - Includes all SEO elements, hreflang tags, and E-E-A-T compliance
   - Dynamic CSS generation with unique color schemes and layouts

4. **🔍 Image Reference Analysis (Optional)**
   - **Only runs when `--need-images` flag is used**
   - Advanced parsing of generated HTML for all image references
   - Identifies `<img>` tags and creates comprehensive image requirement list
   - Analyzes image context and purpose within HTML structure

5. **🧠 AI-Contextual Image Prompt Generation (Optional)**
   - Uses **GPT-5** to analyze HTML content and generate contextual prompts
   - Creates specific, relevant prompts for each image based on surrounding content
   - Generates professional gambling industry-appropriate descriptions
   - Ensures brand consistency and visual coherence

6. **🎨 Smart Image Generation (Optional)**
   - Uses **DALL-E 3** model with AI-generated contextual prompts
   - Generates high-quality images with professional gambling industry standards
   - Optimized format conversion and quality management
   - Maximum 6 images per site for performance optimization

7. **📦 HTML Assembly & File Generation**
   - Creates self-contained HTML with embedded CSS and JavaScript
   - Embeds images as **base64 data URLs** when images are generated
   - Creates comprehensive deployment package with SEO files
   - Generates `robots.txt`, `sitemap.xml` with proper hreflang structure
   - Copies brand-specific assets (Paribahis favicon and logo when applicable)

## 🚀 Key Features

### **Advanced AI Architecture**
- **Service-based Modular Design** with specialized AI workflows
- **GPT-5** (`gpt-5-2025-08-07`) for both structure planning and content generation
- **DALL-E 3** for high-quality image generation (when `--need-images` flag is used)
- **Dynamic workflow** that adapts based on user requirements and flags
- **Conditional image generation** - skip image steps when not needed

### **Intelligent Structure Generation**
- **Dynamic HTML planning** based on user requirements and industry best practices
- **Structured output** with JSON Schema validation for consistent results
- **Contextual section planning** optimized for gambling industry needs
- **Adaptive content architecture** that scales with complexity

### **AI-Enhanced Image Workflow (Optional)**
- **Conditional activation** via `--need-images` flag
- **Context-aware prompt generation** using GPT-5 analysis of HTML content
- **DALL-E 3 integration** for high-quality image generation
- **Performance optimization** - maximum 6 images per site
- **CSS-based icons** for UI elements instead of generated images
- **Professional gambling industry** visual standards and branding

### **Flexible Deployment Options**
- **Image-free mode** - ultra-fast generation without images (use without `--need-images` flag)
- **Image-enhanced mode** - complete sites with embedded base64 images (use `--need-images` flag)
- **Zero external dependencies** - deploy anywhere instantly
- **Performance optimized** - CSS icons reduce file size and loading time
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

### **Basic Generation (Image-Free Mode):**
```bash
node cli-api.js generate 
  --primary-keyword "Paribahis" 
  --canonical-url "https://example.com" 
  --brand-name "Paribahis"
```

### **With Images Generation:**
```bash
node cli-api.js generate 
  --primary-keyword "Paribahis" 
  --canonical-url "https://example.com" 
  --need-images
  --brand-name "Paribahis"
```

### **Complete Example with All Options:**
```bash
node cli-api.js generate 
  --primary-keyword "Paribahis Giris" 
  --canonical-url "https://example.com" 
  --hreflang-urls '{"tr":"https://tr.example.com","en":"https://en.example.com"}' 
  --secondary-keywords "bahis,casino,spor" 
  --focus-areas "güvenlik,bonus,mobil" 
  --brand-name "Paribahis" 
  --need-images
  --output-dir "./output"
  --log-level "detailed"
```

### **Using Environment Variable:**
```bash
export OPENAI_API_KEY=sk-...
node cli-api.js generate --primary-keyword "Paribahis" --canonical-url "https://example.com"
```

## ⚡ Enhanced Workflow Advantages

### **🧠 AI-Powered Intelligence**
- **Dynamic structure planning** creates unique layouts for each site
- **Contextual image generation** produces relevant, professional visuals (when --need-images is used)
- **Structured output validation** ensures consistent, high-quality results
- **Adaptive content scaling** based on requirements and complexity
- **SEO optimization** with full keyword cluster targeting

### **🔄 Smart & Efficient**
- **Modular service architecture** allows independent testing and optimization
- **Conditional workflows** - skip image generation when not needed with flag control
- **No wasted API calls** - only generates images when --need-images flag is used
- **Intelligent fallbacks** ensure generation completes even if some services fail
- **Performance optimized** - maximum 6 images per site, CSS icons for UI elements

### **📦 Production Ready**
- **Flexible deployment options** - image-free or image-enhanced modes
- **Self-contained deployment** requires no server configuration or file management
- **Instant deployment** to any hosting service, CDN, or static hosting platform
- **Zero broken links** - all assets embedded when using --need-images
- **Professional output** ready for immediate production use

### **🚀 Performance Optimized**
- **Ultra-fast image-free mode** - generate sites in seconds without images
- **Optimized image mode** - maximum 6 images per site for fast loading
- **CSS-based UI elements** - use Unicode symbols and CSS shapes instead of images
- **Base64 embedding** eliminates network latency for images (when generated)
- **Dynamic CSS generation** - unique visual designs for each site

### **🔧 Developer Friendly**
- **Atomic operations** - each step can be tested and debugged independently  
- **Comprehensive logging** shows exactly what's happening at each stage
- **Graceful error handling** with detailed error messages and recovery suggestions
- **Extensible architecture** for adding new features and AI models

## Command Line Options

### Generate Command
| Option | Description | Example |
|--------|-------------|---------|
| `--primary-keyword <keyword>` | Primary SEO keyword | `--primary-keyword "Paribahis Giris"` |
| `--canonical-url <url>` | Canonical URL | `--canonical-url "https://example.com"` |
| `--hreflang-urls <json>` | Hreflang URLs (JSON) | `--hreflang-urls '{"tr":"https://tr.example.com"}'` |
| `--secondary-keywords <keywords>` | Secondary keywords (comma-separated) | `--secondary-keywords "bahis,casino"` |
| `--focus-areas <areas>` | Focus areas (comma-separated) | `--focus-areas "güvenlik,bonus,mobil"` |
| `--brand-name <name>` | Brand/site name | `--brand-name "Paribahis"` |
| `--need-images` | Generate with image references | `--need-images` |
| `--output-dir <dir>` | Output directory | `--output-dir "./custom-output"` |
| `--log-level <level>` | Logging verbosity | `--log-level "detailed"` |

### Command Examples

**Generate without images (fastest):**
```bash
node cli-api.js generate --primary-keyword "Paribahis" --canonical-url "https://example.com" --brand-name "Paribahis"
```

**Generate with images:**
```bash
node cli-api.js generate --primary-keyword "Paribahis" --canonical-url "https://example.com" --brand-name "Paribahis" --need-images
```

**Full configuration with logging:**
```bash
node cli-api.js generate \
  --primary-keyword "Paribahis Giris online" \
  --canonical-url "https://example.com" \
  --hreflang-urls '{"tr":"https://tr.example.com","en":"https://en.example.com"}' \
  --secondary-keywords "Paribahis,casino,bahis" \
  --focus-areas "güvenlik,bonus,mobil" \
  --brand-name "Paribahis" \
  --need-images \
  --output-dir "./output" \
  --log-level "detailed"
```

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

**Image-Free Mode (without --need-images):**
- **Structure Generation (GPT-5)**: ~5,000-8,000 tokens per site
- **HTML Content Generation (GPT-5)**: ~15,000-25,000 tokens per site  
- **Total tokens**: ~20,000-33,000 per site
- **Generation time**: 30 seconds - 2 minutes
- **No image generation costs**

**Image-Enhanced Mode (with --need-images):**
- **Structure Generation (GPT-5)**: ~5,000-8,000 tokens per site
- **HTML Content Generation (GPT-5)**: ~15,000-25,000 tokens per site
- **Image Prompt Analysis (GPT-5)**: ~8,000-12,000 tokens per site
- **Image Generation (DALL-E 3)**: Maximum 6 images per site
- **Total tokens**: ~28,000-45,000 per site
- **Generation time**: 3-8 minutes depending on image complexity

### Performance Optimizations
- **Conditional workflow**: Skip image generation entirely when not needed
- **Maximum 6 images**: Optimized for performance and cost control
- **CSS-based UI elements**: Use Unicode symbols instead of generated images
- **Intelligent image analysis**: Only generates images actually referenced in HTML
- **Rate limiting**: Built-in delays and retry logic for API reliability

### Typical Generation Stats
- **Image-free sites**: ~25,000 tokens, 1-2 minutes, ~50-100KB HTML
- **Image-enhanced sites**: ~35,000 tokens, 6 images, 4-6 minutes, ~200-400KB HTML

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
      structureGenerator: 'gpt-5-2025-08-07', // Structure planning
      contentGenerator: 'gpt-5-2025-08-07',   // Content generation  
      imageAnalyzer: 'gpt-5-2025-08-07',      // Contextual image prompts
      imageGenerator: 'dall-e-3'              // AI image generation
    },
    limits: {
      maxTokens: 128000
      // temperature: removed - gpt-5-2025-08-07 only supports default (1)
    }
  },
  images: {
    quality: 'hd',
    format: 'webp',
    maxImages: 6,           // Performance optimization
    cssIconsEnabled: true   // Use CSS icons for UI elements
  },
  generation: {
    conditionalImages: true,  // Use --need-images flag control
    dynamicPrompts: true,     // Switch between image/no-image prompts
    seoOptimized: true        // Full keyword cluster optimization
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
├── cli-api.js                       # Main command line interface
├── api-server.js                    # Express API server
├── package.json                     # Dependencies and scripts
├── config/
│   └── openai.config.js            # AI model configuration
├── services/                        # Modular service architecture
│   ├── ai/
│   │   └── content.service.js       # GPT-5 content generation
│   ├── api/
│   │   └── generator-api.service.js # API orchestration
│   ├── core/
│   │   ├── orchestrator.service.js  # Main workflow orchestration
│   │   └── validation.service.js    # Input validation
│   ├── input/
│   │   └── input-processor.service.js # Input processing and normalization
│   ├── processing/
│   │   ├── generator.service.js     # Core generation logic
│   │   ├── html-combiner.service.js # HTML assembly
│   │   ├── html-generator.service.js # HTML file creation
│   │   ├── image-generator.service.js # DALL-E 3 image generation
│   │   └── structure-generator.service.js # GPT-5 structure planning
│   └── utilities/
│       └── prompt.service.js        # Prompt template management
├── schemas/
│   └── structure.schema.js          # JSON Schema for validation
├── prompts/
│   ├── content-generation-prompt.md     # HTML content prompts (with images)
│   ├── no-images-content-generation-prompt.md # HTML prompts (image-free)
│   ├── structure-generation-prompt.md   # Dynamic structure prompts
│   └── image-generation-prompt.md       # AI image generation prompts
├── assets/
│   └── paribahis/                   # Brand-specific assets
│       ├── paribahis-favicon-32.png
│       └── paribahis-logo.svg
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

### Turkish Betting Site (Image-Free)
```bash
node cli-api.js generate \
  --primary-keyword "Paribahis Giris" \
  --canonical-url "https://paribahis.com" \
  --secondary-keywords "paribahis giriş,paribahis kayıt,bahis" \
  --focus-areas "güvenlik,mobil,destek" \
  --brand-name "Paribahis"
```

### Turkish Betting Site (With Images)
```bash
node cli-api.js generate \
  --primary-keyword "Paribahis Giris" \
  --canonical-url "https://paribahis.com" \
  --secondary-keywords "paribahis giriş,paribahis kayıt,bahis" \
  --focus-areas "güvenlik,mobil,destek" \
  --brand-name "Paribahis" \
  --need-images
```

### Casino Site
```bash
node cli-api.js generate \
  --primary-keyword "Casino Metropol" \
  --canonical-url "https://casinometropol.com" \
  --secondary-keywords "casino,slot,poker" \
  --focus-areas "casino,bonus,vip" \
  --brand-name "Casino Metropol" \
  --need-images
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
