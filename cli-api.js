#!/usr/bin/env node

require('dotenv').config();
const { Command } = require('commander');
const GeneratorAPI = require('./services/api/generator-api.service');

const program = new Command();
const generatorAPI = new GeneratorAPI();

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                   🎰 HTML SITE GENERATOR 🎰                   ║
║                                                               ║
║           High-Quality Gambling Sites with OpenAI             ║
║                  E-E-A-T Compliant & SEO Ready                ║
╚═══════════════════════════════════════════════════════════════╝
`;

console.log(banner);

program
  .name('html-generator-api')
  .description('HTML Website Generator with abstracted input system')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a complete HTML website using abstracted input')
  .requiredOption('-pk, --primary-keyword <keyword>', 'Primary SEO keyword')
  .requiredOption('-bn, --brand-name <name>', 'Brand or company name')
  .requiredOption('-cu, --canonical-url <url>', 'Canonical URL for the website')
  .requiredOption('-hu, --hreflang-urls <urls>', 'JSON string of hreflang URLs')
  .option('-sk, --secondary-keywords <keywords>', 'Comma-separated secondary keywords')
  .option('-fa, --focus-areas <areas>', 'Comma-separated focus areas')
  .option('-tl, --target-language <lang>', 'Target language code', 'tr')
  .option('-bt, --business-type <type>', 'Type of business', 'online betting platform')
  .option('-od, --output-dir <dir>', 'Output directory', './output')
  .option('-ll, --log-level <level>', 'Log verbosity level (minimal, standard, detailed, debug)', 'minimal')
  .action(async (options) => {
    console.log('🚀 Starting HTML generation with abstracted input system...');
    
    try {
      // Check for API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ OPENAI_API_KEY environment variable is required');
        console.error('💡 Set it with: export OPENAI_API_KEY="your-api-key"');
        process.exit(1);
      }

      // Initialize GeneratorAPI with explicit API key
      const generatorAPI = new GeneratorAPI(apiKey);
      // Prepare raw input for the abstraction layer
      const rawInput = {
        primaryKeyword: options.primaryKeyword,
        brandName: options.brandName || options.primaryKeyword,
        canonicalUrl: options.canonicalUrl,
        hreflangUrls: options.hreflangUrls,
        secondaryKeywords: options.secondaryKeywords,
        focusAreas: options.focusAreas,
        targetLanguage: options.targetLanguage,
        businessType: options.businessType,
        outputDir: options.outputDir,
        logLevel: options.logLevel
      };

      console.log('📋 Raw Input:', rawInput);
      
      // Progress callback for CLI
      const onProgress = (progress) => {
        const progressBar = '█'.repeat(Math.floor(progress.percentage / 5)) + 
                           '░'.repeat(20 - Math.floor(progress.percentage / 5));
        console.log(`[${progressBar}] ${progress.percentage}% - ${progress.message}`);
      };

      // Generate using the abstracted API
      const result = await generatorAPI.generate(rawInput, onProgress);
      
      if (result.success) {
        console.log('✅ Generation completed successfully!');
        
        if (result.outputPath) {
          console.log('📄 Main HTML file:', result.outputPath);
        }
        
        if (result.rawHtmlPath) {
          console.log('🔍 Raw HTML file:', result.rawHtmlPath);
        }
        
        if (result.generatedFiles) {
          console.log('📁 Generated files:');
          result.generatedFiles.forEach(file => console.log(`   - ${file}`));
        }
        
        if (result.metadata) {
          console.log('📊 Generation metadata:');
          console.log(`   - Generated at: ${result.metadata.generatedAt}`);
          console.log(`   - Primary keyword: ${result.metadata.primaryKeyword}`);
          console.log(`   - Brand name: ${result.metadata.brandName}`);
          console.log(`   - Output directory: ${result.metadata.outputDirectory}`);
        }
        
        // Explicitly exit to ensure the process terminates
        process.exit(0);
        
      } else {
        console.error('❌ Generation failed:', result.error);
        if (result.errorType === 'validation') {
          console.error('💡 Please check your input parameters and try again.');
        }
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Unexpected error:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate input parameters without generating')
  .requiredOption('-pk, --primary-keyword <keyword>', 'Primary SEO keyword')
  .option('-bn, --brand-name <name>', 'Brand or company name')
  .option('-cu, --canonical-url <url>', 'Canonical URL for the website')
  .option('-hu, --hreflang-urls <urls>', 'JSON string of hreflang URLs')
  .option('-sk, --secondary-keywords <keywords>', 'Comma-separated secondary keywords')
  .option('-fa, --focus-areas <areas>', 'Comma-separated focus areas')
  .option('-tl, --target-language <lang>', 'Target language code', 'tr')
  .action((options) => {
    
    try {
      const rawInput = {
        primaryKeyword: options.primaryKeyword,
        brandName: options.brandName || options.primaryKeyword,
        canonicalUrl: options.canonicalUrl,
        hreflangUrls: options.hreflangUrls,
        secondaryKeywords: options.secondaryKeywords,
        focusAreas: options.focusAreas,
        targetLanguage: options.targetLanguage
      };

      const validation = generatorAPI.validateInput(rawInput);
      
      if (validation.valid) {
        console.log('✅ Input validation passed!');
        
        if (validation.warnings && validation.warnings.length > 0) {
          console.log('⚠️  Warnings:');
          validation.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        console.log('📋 Processed input:');
        console.log('   - Primary keyword:', validation.processedInput.primaryKeyword);
        console.log('   - Brand name:', validation.processedInput.brandName);
        console.log('   - Secondary keywords:', validation.processedInput.secondaryKeywords?.join(', ') || 'None');
        console.log('   - Focus areas:', validation.processedInput.focusAreas?.join(', ') || 'None');
        console.log('   - Target language:', validation.processedInput.targetLanguage);
        console.log('   - Output directory:', validation.processedInput.outputDir);
        
      } else {
        console.error('❌ Input validation failed:', validation.error);
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Validation error:', error.message);
      process.exit(1);
    }
  });

program
  .command('schema')
  .description('Show input schema for API integration')
  .action(() => {
    console.log('📋 Input Schema for API Integration:');
    
    try {
      const schema = generatorAPI.getInputSchema();
      console.log(JSON.stringify(schema, null, 2));
    } catch (error) {
      console.error('❌ Failed to get schema:', error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check the status of the generator')
  .action(() => {
    console.log('🔍 Generator Status:');
    console.log('✅ Services: Ready');
    console.log('✅ Input Abstraction: Active');
    console.log('✅ Dependencies: Loaded');
    console.log('📂 Working Directory:', process.cwd());
    console.log('🕒 Current Time:', new Date().toISOString());
    
    // Show active generations
    const activeGenerations = generatorAPI.getActiveGenerations();
    if (activeGenerations.length > 0) {
      console.log('📊 Active Generations:');
      activeGenerations.forEach(gen => {
        console.log(`   - ${gen.id}: ${gen.status} (${gen.input.primaryKeyword})`);
      });
    } else {
      console.log('📊 Active Generations: None');
    }
    
    process.exit(0);
  });

program.parse();
