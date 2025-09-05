# Services Folder Refactoring Plan

## 🎯 **Current Issues & Refactoring Strategy**

### **📋 Current Problems**

1. **Duplicate Services**: `generator.service.js` and `generator-enhanced.service.js` have overlapping functionality
2. **Missing Production Features**: No logging, error handling, validation integration
3. **Inconsistent Architecture**: Services don't follow consistent patterns
4. **No Dependency Injection**: Hard-coded dependencies make testing difficult
5. **Mixed Responsibilities**: Some services handle multiple concerns
6. **Missing Interfaces**: No standardized service contracts

## 🏗️ **Proposed Refactored Structure**

```
services/
├── core/                           # Core business logic services
│   ├── orchestrator.service.js    # Main workflow orchestration
│   ├── validation.service.js      # Input validation service
│   └── metrics.service.js         # Performance metrics tracking
├── ai/                            # AI-related services
│   ├── structure.service.js       # Dynamic structure generation
│   ├── content.service.js         # HTML content generation
│   ├── image-prompt.service.js    # AI image prompt analysis
│   └── image-generation.service.js # Image generation with AI
├── processing/                    # File processing services
│   ├── html-parser.service.js     # HTML parsing and analysis
│   ├── html-combiner.service.js   # HTML assembly and embedding
│   └── file-manager.service.js    # File operations and management
├── utilities/                     # Utility services
│   ├── cache.service.js           # Caching layer
│   ├── retry.service.js           # Retry logic for API calls
│   └── placeholder.service.js     # Placeholder generation
├── base/                          # Base classes and interfaces
│   ├── base.service.js            # Abstract base service class
│   ├── ai-service.interface.js    # Interface for AI services
│   └── service.factory.js         # Service factory for DI
└── index.js                       # Service registry and exports
```

## 📋 **Implementation Plan**

### **Phase 1: Foundation Classes**

#### **1. Base Service Class**
Create `services/base/base.service.js`:

```javascript
const logger = require('../../src/utils/logger');
const { BaseError } = require('../../src/utils/errors');

class BaseService {
  constructor(config = {}) {
    this.config = config;
    this.logger = logger;
    this.requestId = null;
  }

  setRequestId(requestId) {
    this.requestId = requestId;
    return this;
  }

  logOperation(operation, data = {}) {
    this.logger.info(`${this.constructor.name}: ${operation}`, {
      requestId: this.requestId,
      service: this.constructor.name,
      ...data
    });
  }

  logError(operation, error, data = {}) {
    this.logger.error(`${this.constructor.name}: ${operation} failed`, {
      requestId: this.requestId,
      service: this.constructor.name,
      error: error.message,
      stack: error.stack,
      ...data
    });
  }

  async executeWithRetry(operation, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logOperation(`Executing ${operation.name} (attempt ${attempt})`);
        const result = await operation();
        this.logOperation(`Successfully completed ${operation.name}`);
        return result;
      } catch (error) {
        lastError = error;
        this.logError(`${operation.name} attempt ${attempt}`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  validateRequired(params, requiredFields) {
    const missing = requiredFields.filter(field => !params[field]);
    if (missing.length > 0) {
      throw new BaseError(`Missing required parameters: ${missing.join(', ')}`);
    }
  }
}

module.exports = BaseService;
```

#### **2. AI Service Interface**
Create `services/base/ai-service.interface.js`:

```javascript
class AIServiceInterface {
  constructor(apiKey, model) {
    if (new.target === AIServiceInterface) {
      throw new Error('Cannot instantiate interface directly');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async validateApiKey() {
    throw new Error('validateApiKey method must be implemented');
  }

  async makeApiCall(params) {
    throw new Error('makeApiCall method must be implemented');
  }

  getUsageStats() {
    throw new Error('getUsageStats method must be implemented');
  }
}

module.exports = AIServiceInterface;
```

### **Phase 2: Refactored Core Services**

#### **1. Main Orchestrator Service**
Replace both generator services with `services/core/orchestrator.service.js`:

```javascript
const BaseService = require('../base/base.service');
const StructureService = require('../ai/structure.service');
const ContentService = require('../ai/content.service');
const ImagePromptService = require('../ai/image-prompt.service');
const ImageGenerationService = require('../ai/image-generation.service');
const HTMLCombinerService = require('../processing/html-combiner.service');
const FileManagerService = require('../processing/file-manager.service');
const ValidationService = require('./validation.service');
const MetricsService = require('./metrics.service');

class OrchestratorService extends BaseService {
  constructor(apiKey, config = {}) {
    super(config);
    this.apiKey = apiKey;
    this.services = this.initializeServices(apiKey, config);
    this.metrics = new MetricsService();
  }

  initializeServices(apiKey, config) {
    return {
      validation: new ValidationService(),
      structure: new StructureService(apiKey, config.ai?.structure),
      content: new ContentService(apiKey, config.ai?.content),
      imagePrompt: new ImagePromptService(apiKey, config.ai?.imagePrompt),
      imageGeneration: new ImageGenerationService(apiKey, config.ai?.imageGeneration),
      htmlCombiner: new HTMLCombinerService(config.processing?.htmlCombiner),
      fileManager: new FileManagerService(config.processing?.fileManager)
    };
  }

  async generateSite(params) {
    const requestId = this.logger.generateRequestId();
    this.setRequestId(requestId);
    
    const startTime = Date.now();
    this.logger.logRequest(requestId, 'generateSite', params);

    try {
      // Step 1: Validate inputs
      const validatedParams = await this.services.validation
        .setRequestId(requestId)
        .validateGenerationParams(params);

      // Step 2: Generate structure
      const structure = await this.services.structure
        .setRequestId(requestId)
        .generateStructure(validatedParams);

      // Step 3: Generate content
      const content = await this.services.content
        .setRequestId(requestId)
        .generateHTML({ ...validatedParams, structure });

      // Step 4: Parse images
      const imageReferences = await this.services.content
        .parseImageReferences(content);

      // Step 5: Generate image prompts
      const imagePrompts = await this.services.imagePrompt
        .setRequestId(requestId)
        .generatePrompts(content, imageReferences);

      // Step 6: Generate images
      const images = await this.services.imageGeneration
        .setRequestId(requestId)
        .generateImages(imagePrompts, validatedParams.outputDir);

      // Step 7: Combine HTML
      const combinedHTML = await this.services.htmlCombiner
        .setRequestId(requestId)
        .createSelfContainedHTML(content, images, validatedParams.outputDir);

      // Step 8: Generate additional files
      await this.services.fileManager
        .setRequestId(requestId)
        .generateAdditionalFiles(validatedParams.outputDir, validatedParams);

      const duration = Date.now() - startTime;
      const result = {
        success: true,
        requestId,
        duration,
        outputDir: validatedParams.outputDir,
        htmlFile: combinedHTML.filepath,
        images: images.length,
        metrics: this.metrics.getMetrics()
      };

      this.logger.logResponse(requestId, 'generateSite', result, duration);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logError(requestId, 'generateSite', error, params);
      
      return {
        success: false,
        requestId,
        duration,
        error: error.message,
        metrics: this.metrics.getMetrics()
      };
    }
  }

  async getSystemStatus() {
    const requestId = this.logger.generateRequestId();
    this.setRequestId(requestId);

    try {
      const serviceStatuses = await Promise.all([
        this.checkServiceStatus('structure', this.services.structure),
        this.checkServiceStatus('content', this.services.content),
        this.checkServiceStatus('imagePrompt', this.services.imagePrompt),
        this.checkServiceStatus('imageGeneration', this.services.imageGeneration)
      ]);

      return {
        ready: serviceStatuses.every(status => status.valid),
        services: serviceStatuses,
        metrics: this.metrics.getMetrics(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logError('getSystemStatus', error);
      throw error;
    }
  }

  async checkServiceStatus(name, service) {
    try {
      const isValid = await service.validateApiKey();
      return {
        name,
        valid: isValid,
        model: service.model,
        className: service.constructor.name
      };
    } catch (error) {
      return {
        name,
        valid: false,
        error: error.message,
        className: service.constructor.name
      };
    }
  }
}

module.exports = OrchestratorService;
```

#### **2. Validation Service**
Create `services/core/validation.service.js`:

```javascript
const BaseService = require('../base/base.service');
const { validateGenerationParams } = require('../../src/utils/validation');
const { ValidationError } = require('../../src/utils/errors');

class ValidationService extends BaseService {
  constructor(config = {}) {
    super(config);
  }

  async validateGenerationParams(params) {
    this.logOperation('validateGenerationParams', { paramKeys: Object.keys(params) });

    try {
      const validated = validateGenerationParams(params);
      this.logOperation('Validation successful', { validatedParams: Object.keys(validated) });
      return validated;
    } catch (error) {
      this.logError('validateGenerationParams', error, { params });
      throw new ValidationError(`Validation failed: ${error.message}`);
    }
  }

  async validateApiKey(apiKey) {
    this.logOperation('validateApiKey');

    if (!apiKey || typeof apiKey !== 'string') {
      throw new ValidationError('API key is required and must be a string');
    }

    if (!apiKey.startsWith('sk-')) {
      throw new ValidationError('Invalid API key format');
    }

    return apiKey;
  }

  async validateOutputDirectory(outputDir) {
    this.logOperation('validateOutputDirectory', { outputDir });

    if (!outputDir || typeof outputDir !== 'string') {
      throw new ValidationError('Output directory is required');
    }

    // Additional validation logic here
    return outputDir;
  }
}

module.exports = ValidationService;
```

### **Phase 3: Specialized AI Services**

#### **1. Structure Service**
Refactor `structure-generator.service.js` → `services/ai/structure.service.js`:

```javascript
const BaseService = require('../base/base.service');
const AIServiceInterface = require('../base/ai-service.interface');
const OpenAI = require('openai');
const { OpenAIError } = require('../../src/utils/errors');

class StructureService extends BaseService {
  constructor(apiKey, config = {}) {
    super(config);
    this.apiKey = apiKey;
    this.model = config.model || 'gpt-5-nano';
    this.client = new OpenAI({ apiKey });
    this.usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      errors: 0
    };
  }

  async generateStructure(params) {
    this.logOperation('generateStructure', { 
      primaryKeyword: params.primaryKeyword,
      model: this.model 
    });

    const startTime = Date.now();

    try {
      this.validateRequired(params, ['primaryKeyword', 'brandName']);

      const prompt = await this.buildStructurePrompt(params);
      const response = await this.makeApiCall(prompt);
      const structure = this.parseStructureResponse(response);

      this.usageStats.totalRequests++;
      this.usageStats.totalTokens += response.usage?.total_tokens || 0;

      const duration = Date.now() - startTime;
      this.logOperation('Structure generation completed', { 
        duration,
        tokensUsed: response.usage?.total_tokens 
      });

      return {
        success: true,
        structure,
        tokensUsed: response.usage?.total_tokens,
        duration
      };

    } catch (error) {
      this.usageStats.errors++;
      this.logError('generateStructure', error, { params });
      throw new OpenAIError(`Structure generation failed: ${error.message}`, this.model);
    }
  }

  async makeApiCall(prompt) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert web architect specializing in gambling site structures.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_completion_tokens: 4000,
        temperature: 0.7
      });

      return response;
    } catch (error) {
      throw new OpenAIError(`API call failed: ${error.message}`, this.model);
    }
  }

  async validateApiKey() {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      return false;
    }
  }

  getUsageStats() {
    return { ...this.usageStats };
  }

  // ... other methods (buildStructurePrompt, parseStructureResponse, etc.)
}

module.exports = StructureService;
```

### **Phase 4: Processing Services**

#### **1. HTML Combiner Service**
Refactor existing `html-combiner.service.js`:

```javascript
const BaseService = require('../base/base.service');
const fs = require('fs').promises;
const path = require('path');
const { FileSystemError } = require('../../src/utils/errors');

class HTMLCombinerService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.config = {
      imageFormat: 'webp',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      ...config
    };
  }

  async createSelfContainedHTML(htmlContent, images, outputDir, filename = 'index.html') {
    this.logOperation('createSelfContainedHTML', {
      imagesCount: images.length,
      outputDir,
      filename
    });

    const startTime = Date.now();

    try {
      this.validateRequired({ htmlContent, images, outputDir }, ['htmlContent', 'images', 'outputDir']);

      // Embed images as base64
      const combinedHTML = await this.embedImages(htmlContent, images);
      
      // Save file
      const outputPath = path.join(outputDir, filename);
      await this.saveHTML(combinedHTML, outputPath);

      // Get file stats
      const stats = await fs.stat(outputPath);
      
      if (stats.size > this.config.maxFileSize) {
        this.logger.warn('Generated file exceeds recommended size', {
          requestId: this.requestId,
          size: stats.size,
          maxSize: this.config.maxFileSize
        });
      }

      const duration = Date.now() - startTime;
      const result = {
        success: true,
        filepath: outputPath,
        filename,
        size: stats.size,
        formattedSize: this.formatBytes(stats.size),
        embeddedImages: images.length,
        duration
      };

      this.logOperation('HTML combining completed', result);
      return result;

    } catch (error) {
      this.logError('createSelfContainedHTML', error, { outputDir, filename });
      throw new FileSystemError(`HTML combining failed: ${error.message}`, 'combine', outputDir);
    }
  }

  async embedImages(htmlContent, images) {
    this.logOperation('embedImages', { imagesCount: images.length });

    let processedHTML = htmlContent;
    
    for (const image of images) {
      try {
        const base64Data = await this.imageToBase64(image.filepath);
        const dataUrl = `data:image/${this.config.imageFormat};base64,${base64Data}`;
        
        // Replace image reference in HTML
        processedHTML = processedHTML.replace(
          new RegExp(image.originalSrc, 'g'),
          dataUrl
        );

        this.logOperation('Image embedded', { 
          filename: image.filename,
          originalSrc: image.originalSrc 
        });

      } catch (error) {
        this.logError('embedImages', error, { image: image.filename });
        // Continue with other images even if one fails
      }
    }

    return processedHTML;
  }

  async imageToBase64(filepath) {
    try {
      const imageBuffer = await fs.readFile(filepath);
      return imageBuffer.toString('base64');
    } catch (error) {
      throw new FileSystemError(`Failed to read image: ${error.message}`, 'read', filepath);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async saveHTML(content, filepath) {
    try {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, content, 'utf-8');
    } catch (error) {
      throw new FileSystemError(`Failed to save HTML: ${error.message}`, 'write', filepath);
    }
  }
}

module.exports = HTMLCombinerService;
```

### **Phase 5: Utility Services**

#### **1. Cache Service**
Create `services/utilities/cache.service.js`:

```javascript
const BaseService = require('../base/base.service');
const NodeCache = require('node-cache');

class CacheService extends BaseService {
  constructor(config = {}) {
    super(config);
    this.cache = new NodeCache({
      stdTTL: config.ttl || 600, // 10 minutes default
      checkperiod: config.checkPeriod || 120,
      useClones: false
    });
  }

  async get(key) {
    this.logOperation('cache_get', { key });
    const value = this.cache.get(key);
    
    if (value) {
      this.logOperation('cache_hit', { key });
    } else {
      this.logOperation('cache_miss', { key });
    }
    
    return value;
  }

  async set(key, value, ttl = null) {
    this.logOperation('cache_set', { key, ttl });
    return this.cache.set(key, value, ttl);
  }

  async del(key) {
    this.logOperation('cache_delete', { key });
    return this.cache.del(key);
  }

  getStats() {
    return this.cache.getStats();
  }
}

module.exports = CacheService;
```

#### **2. Service Factory**
Create `services/base/service.factory.js`:

```javascript
const logger = require('../../src/utils/logger');

class ServiceFactory {
  constructor() {
    this.services = new Map();
    this.config = {};
  }

  setConfig(config) {
    this.config = config;
    return this;
  }

  register(name, ServiceClass, config = {}) {
    this.services.set(name, { ServiceClass, config });
    return this;
  }

  create(name, ...args) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not registered`);
    }

    const { ServiceClass, config } = this.services.get(name);
    const mergedConfig = { ...this.config, ...config };
    
    logger.info(`Creating service: ${name}`, { 
      className: ServiceClass.name,
      config: Object.keys(mergedConfig)
    });

    return new ServiceClass(...args, mergedConfig);
  }

  createAll(apiKey) {
    const instances = {};
    
    for (const [name] of this.services) {
      instances[name] = this.create(name, apiKey);
    }
    
    return instances;
  }
}

module.exports = ServiceFactory;
```

## 🎯 **Migration Plan**

### **Step 1: Create Base Infrastructure**
1. Create `services/base/` directory with base classes
2. Create `services/utilities/` with cache and retry services
3. Update existing services to extend BaseService

### **Step 2: Consolidate Generator Services**
1. Create new `OrchestratorService` combining both generators
2. Update CLI to use new orchestrator
3. Remove duplicate generator files

### **Step 3: Refactor AI Services**
1. Move structure, content, image services to `services/ai/`
2. Add consistent error handling and logging
3. Implement usage tracking

### **Step 4: Enhance Processing Services**
1. Add validation to HTML combiner
2. Create file manager service
3. Add performance monitoring

### **Step 5: Integration & Testing**
1. Update all imports and dependencies
2. Create comprehensive tests for each service
3. Add integration tests for complete workflow

## 📊 **Benefits of Refactoring**

### **1. Production Readiness**
- ✅ Comprehensive logging and error handling
- ✅ Performance monitoring and metrics
- ✅ Retry logic and graceful failures
- ✅ Input validation throughout

### **2. Maintainability**
- ✅ Clear separation of concerns
- ✅ Consistent service patterns
- ✅ Dependency injection support
- ✅ Easy to test and mock

### **3. Scalability**
- ✅ Modular architecture
- ✅ Caching layer for performance
- ✅ Service factory for instance management
- ✅ Configuration-driven behavior

### **4. Developer Experience**
- ✅ Clear service contracts
- ✅ Comprehensive documentation
- ✅ Easy to extend and modify
- ✅ Consistent error handling

This refactoring will transform the services from a collection of individual scripts into a professional, production-ready service architecture with proper error handling, logging, caching, and monitoring capabilities.
