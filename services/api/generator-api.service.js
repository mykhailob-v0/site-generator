/**
 * API Wrapper Service for HTML Generator
 * Provides clean interface for external API and UI integration
 */

const { InputProcessor, ValidationError } = require('../input/input-processor.service');
const OrchestratorService = require('../core/orchestrator.service');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generation result structure
 * @typedef {Object} GenerationResult
 * @property {boolean} success - Whether generation was successful
 * @property {string} [outputPath] - Path to generated HTML file
 * @property {string} [rawHtmlPath] - Path to raw HTML file for debugging
 * @property {Object} [metadata] - Generation metadata
 * @property {string} [error] - Error message if generation failed
 * @property {Object} [logs] - Generation logs and metrics
 */

/**
 * Progress callback function
 * @callback ProgressCallback
 * @param {Object} progress - Progress information
 * @param {string} progress.step - Current step name
 * @param {number} progress.percentage - Progress percentage (0-100)
 * @param {string} progress.message - Progress message
 * @param {Object} [progress.data] - Additional step data
 */

class GeneratorAPI {
  constructor(apiKey = null) {
    this.inputProcessor = new InputProcessor();
    this.orchestrator = null;
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
    this.activeGenerations = new Map();
  }

  /**
   * Initialize orchestrator when needed
   */
  initializeOrchestrator() {
    if (!this.orchestrator) {
      if (!this.apiKey) {
        throw new Error('API key required. Provide it to the constructor or set OPENAI_API_KEY environment variable.');
      }
      this.orchestrator = new OrchestratorService(this.apiKey);
    }
    return this.orchestrator;
  }

  /**
   * Generate website with input validation and progress tracking
   * @param {Object} rawInput - Raw input parameters
   * @param {ProgressCallback} [onProgress] - Progress callback function
   * @returns {Promise<GenerationResult>} - Generation result
   */
  async generate(rawInput, onProgress) {
    const generationId = this.generateId();
    
    try {
      // Process and validate input
      if (onProgress) onProgress({ step: 'validation', percentage: 5, message: 'Validating input parameters' });
      
      const processedInput = this.inputProcessor.process(rawInput);
      
      // Store generation info
      this.activeGenerations.set(generationId, {
        input: processedInput,
        startTime: Date.now(),
        status: 'running'
      });

      if (onProgress) onProgress({ 
        step: 'initialization', 
        percentage: 10, 
        message: 'Initializing generation pipeline',
        data: { outputDir: processedInput.outputDir }
      });

      // Convert to orchestrator format and generate
      const orchestratorInput = this.convertToOrchestratorInput(processedInput);
      
      // Initialize orchestrator
      const orchestrator = this.initializeOrchestrator();
      
      // Wrap orchestrator with progress tracking
      const result = await this.executeWithProgress(
        orchestratorInput, 
        generationId,
        onProgress
      );

      // Update generation status
      this.activeGenerations.set(generationId, {
        ...this.activeGenerations.get(generationId),
        status: 'completed',
        endTime: Date.now(),
        result
      });

      return result;

    } catch (error) {
      // Update generation status with error
      this.activeGenerations.set(generationId, {
        ...this.activeGenerations.get(generationId),
        status: 'failed',
        endTime: Date.now(),
        error: error.message
      });

      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation Error: ${error.message}`,
          errorType: 'validation'
        };
      }

      return {
        success: false,
        error: `Generation Error: ${error.message}`,
        errorType: 'generation',
        logs: this.getGenerationLogs(generationId)
      };
    }
  }

  /**
   * Execute generation with real progress tracking
   * @param {Object} orchestratorInput - Input for orchestrator
   * @param {string} generationId - Generation ID
   * @param {ProgressCallback} onProgress - Progress callback
   * @returns {Promise<GenerationResult>} - Generation result
   */
  async executeWithProgress(orchestratorInput, generationId, onProgress) {
    const steps = [
      { name: 'validation', percentage: 10, message: 'Validating input parameters' },
      { name: 'structure_generation', percentage: 25, message: 'Generating website structure' },
      { name: 'html_generation', percentage: 45, message: 'Generating website content' },
      { name: 'image_prompt_generation', percentage: 60, message: 'Generating image prompts' },
      { name: 'image_generation', percentage: 75, message: 'Generating images' },
      { name: 'html_combination', percentage: 90, message: 'Combining HTML components' },
      { name: 'additional_files', percentage: 95, message: 'Finalizing output files' }
    ];

    let orchestrator;
    try {
      // Start with validation
      if (onProgress) onProgress(steps[0]);

      // Execute generation with step-by-step progress tracking
      orchestrator = this.initializeOrchestrator();
      
      // Override the orchestrator's executeStep to report progress
      const originalExecuteStep = orchestrator.executeStep.bind(orchestrator);
      orchestrator.executeStep = async (stepName, stepFunction) => {
        // Find the step and report progress
        const step = steps.find(s => s.name === stepName);
        if (step && onProgress) {
          onProgress(step);
        }
        
        // Execute the actual step
        return await originalExecuteStep(stepName, stepFunction);
      };
      
      const result = await orchestrator.generateSite(orchestratorInput);

      if (onProgress) onProgress({ 
        name: 'completed', 
        percentage: 100, 
        message: 'Generation completed successfully' 
      });

      // Build result with file paths
      const finalResult = await this.buildGenerationResult(orchestratorInput, result);
      
      // Cleanup orchestrator to clear intervals and prevent hanging
      orchestrator.destroy();
      
      return finalResult;

    } catch (error) {
      // Cleanup orchestrator on error as well
      if (orchestrator && orchestrator.destroy) {
        orchestrator.destroy();
      }
      
      if (onProgress) onProgress({ 
        name: 'error', 
        percentage: 0, 
        message: `Generation failed: ${error.message}` 
      });
      throw error;
    }
  }

  /**
   * Build generation result with file information
   * @param {Object} input - Generation input
   * @param {Object} orchestratorResult - Orchestrator result
   * @returns {Promise<GenerationResult>} - Complete result
   */
  async buildGenerationResult(input, orchestratorResult) {
    const outputDir = input.outputDir || './output';
    const primaryKeyword = input.primaryKeyword.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const date = new Date().toISOString().split('T')[0];
    const expectedOutputDir = path.join(outputDir, `${primaryKeyword}-${date}`);

    const result = {
      success: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        primaryKeyword: input.primaryKeyword,
        brandName: input.brandName,
        outputDirectory: expectedOutputDir
      }
    };

    // Check for generated files
    try {
      const outputFiles = await fs.readdir(expectedOutputDir);
      
      // Look for main HTML file
      const htmlFile = outputFiles.find(file => file.endsWith('.html') && !file.startsWith('raw'));
      if (htmlFile) {
        result.outputPath = path.join(expectedOutputDir, htmlFile);
      }

      // Look for raw HTML file
      const rawHtmlFile = outputFiles.find(file => file === 'raw.html');
      if (rawHtmlFile) {
        result.rawHtmlPath = path.join(expectedOutputDir, rawHtmlFile);
      }

      result.generatedFiles = outputFiles.map(file => path.join(expectedOutputDir, file));

    } catch (error) {
      // Output directory doesn't exist or is empty
      result.warning = 'Output files not found - generation may have failed';
    }

    return result;
  }

  /**
   * Convert processed input to orchestrator format
   * @param {Object} processedInput - Processed input from InputProcessor
   * @returns {Object} - Orchestrator input format
   */
  convertToOrchestratorInput(processedInput) {
    return {
      primaryKeyword: processedInput.primaryKeyword,
      brandName: processedInput.brandName,
      canonicalUrl: processedInput.canonicalUrl,
      hreflangUrls: processedInput.hreflangUrls,
      secondaryKeywords: processedInput.secondaryKeywords?.join(',') || '',
      focusAreas: processedInput.focusAreas?.join(',') || '',
      outputDir: processedInput.outputDir,
      targetLanguage: processedInput.targetLanguage,
      businessType: processedInput.businessType
    };
  }

  /**
   * Get input validation schema for API documentation
   * @returns {Object} - JSON schema
   */
  getInputSchema() {
    return this.inputProcessor.getSchema();
  }

  /**
   * Validate input without generating
   * @param {Object} rawInput - Raw input to validate
   * @returns {Object} - Validation result
   */
  validateInput(rawInput) {
    try {
      const processedInput = this.inputProcessor.process(rawInput);
      return {
        valid: true,
        processedInput,
        warnings: this.getValidationWarnings(processedInput)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        errorType: error.name
      };
    }
  }

  /**
   * Get validation warnings for input
   * @param {Object} processedInput - Processed input
   * @returns {string[]} - Array of warnings
   */
  getValidationWarnings(processedInput) {
    const warnings = [];

    if (!processedInput.secondaryKeywords || processedInput.secondaryKeywords.length === 0) {
      warnings.push('No secondary keywords provided - SEO optimization may be limited');
    }

    if (!processedInput.hreflangUrls || Object.keys(processedInput.hreflangUrls).length === 0) {
      warnings.push('No hreflang URLs provided - international SEO may be affected');
    }

    if (processedInput.focusAreas?.length < 3) {
      warnings.push('Few focus areas provided - content may be less comprehensive');
    }

    return warnings;
  }

  /**
   * Get generation status
   * @param {string} generationId - Generation ID
   * @returns {Object|null} - Generation status or null if not found
   */
  getGenerationStatus(generationId) {
    return this.activeGenerations.get(generationId) || null;
  }

  /**
   * Get all active generations
   * @returns {Object[]} - Array of active generations
   */
  getActiveGenerations() {
    return Array.from(this.activeGenerations.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }

  /**
   * Get generation logs
   * @param {string} generationId - Generation ID
   * @returns {Object} - Generation logs
   */
  getGenerationLogs(generationId) {
    const generation = this.activeGenerations.get(generationId);
    if (!generation) return null;

    return {
      generationId,
      duration: generation.endTime ? generation.endTime - generation.startTime : Date.now() - generation.startTime,
      status: generation.status,
      input: generation.input,
      error: generation.error
    };
  }

  /**
   * Clean up old generations
   * @param {number} maxAge - Maximum age in milliseconds
   */
  cleanupGenerations(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    const now = Date.now();
    for (const [id, info] of this.activeGenerations.entries()) {
      const age = now - info.startTime;
      if (age > maxAge) {
        this.activeGenerations.delete(id);
      }
    }
  }

  /**
   * Generate unique ID for generation
   * @returns {string} - Unique ID
   */
  generateId() {
    return `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = GeneratorAPI;
