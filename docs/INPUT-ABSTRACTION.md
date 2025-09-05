# Input Abstraction System Documentation

## Overview

The HTML Generator now includes a comprehensive input abstraction layer that makes it easy to build APIs, web interfaces, and integrate with other systems. The abstraction handles validation, normalization, and provides clean interfaces for external consumption.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend/UI   │───▶│  GeneratorAPI    │───▶│ Orchestrator    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ InputProcessor   │
                       └──────────────────┘
```

## Core Components

### 1. InputProcessor (`services/input/input-processor.service.js`)

Handles all input validation, normalization, and enrichment:

- **Validation**: Required fields, format validation, constraint checking
- **Normalization**: Type conversion, default values, array parsing
- **Enrichment**: Derived fields, metadata generation, caching keys

### 2. GeneratorAPI (`services/api/generator-api.service.js`)

Provides clean API interface with:

- **Progress Tracking**: Real-time generation progress callbacks
- **Error Handling**: Structured error responses with types
- **Result Management**: File paths, metadata, generation logs
- **Status Monitoring**: Active generations, system health

## Input Schema

### Required Fields
- `primaryKeyword` (string): Main SEO keyword
- `brandName` (string): Brand or company name

### Optional Fields
- `secondaryKeywords` (array): Additional SEO keywords
- `focusAreas` (array): Areas of focus (security, mobile, etc.)
- `canonicalUrl` (string): Canonical URL
- `hreflangUrls` (object): International URLs
- `targetLanguage` (string): Target language code
- `businessType` (string): Type of business
- `outputDir` (string): Output directory

### Example Input

```javascript
const input = {
  primaryKeyword: "Paribahis",
  brandName: "Paribahis Resmi",
  secondaryKeywords: ["bahis", "casino", "spor"],
  focusAreas: ["güvenlik", "mobil", "bonus"],
  canonicalUrl: "https://paribahis.com",
  hreflangUrls: {
    "tr": "https://tr.paribahis.com",
    "en": "https://en.paribahis.com"
  },
  targetLanguage: "tr"
};
```

## Usage Examples

### 1. Simple CLI Usage

```bash
# Using the abstracted CLI
node cli-api.js generate \
  --primary-keyword "Paribahis" \
  --brand-name "Paribahis Resmi" \
  --secondary-keywords "bahis,casino,spor" \
  --focus-areas "güvenlik,mobil,bonus"

# Validate input without generating
node cli-api.js validate \
  --primary-keyword "Paribahis" \
  --brand-name "Paribahis Resmi"

# Get input schema
node cli-api.js schema
```

### 2. Direct JavaScript Usage

```javascript
const GeneratorAPI = require('./services/api/generator-api.service');

async function generateWebsite() {
  const generatorAPI = new GeneratorAPI();
  
  const input = {
    primaryKeyword: "Paribahis",
    brandName: "Paribahis Resmi",
    secondaryKeywords: "bahis,casino,spor", // String or array
    focusAreas: "güvenlik,mobil,bonus"      // String or array
  };
  
  // Progress callback
  const onProgress = (progress) => {
    console.log(`${progress.percentage}% - ${progress.message}`);
  };
  
  try {
    const result = await generatorAPI.generate(input, onProgress);
    
    if (result.success) {
      console.log('Generated files:', result.generatedFiles);
      console.log('Output path:', result.outputPath);
      console.log('Raw HTML:', result.rawHtmlPath);
    } else {
      console.error('Generation failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### 3. Express.js API Server

```javascript
const express = require('express');
const GeneratorAPI = require('./services/api/generator-api.service');

const app = express();
const generatorAPI = new GeneratorAPI();

app.use(express.json());

app.post('/api/generate', async (req, res) => {
  try {
    const result = await generatorAPI.generate(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('API server running on port 3000');
});
```

### 4. React Frontend Integration

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const WebsiteGenerator = () => {
  const [input, setInput] = useState({
    primaryKeyword: '',
    brandName: '',
    secondaryKeywords: [],
    focusAreas: []
  });
  
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  
  const generateWebsite = async () => {
    try {
      // Use Server-Sent Events for progress
      const eventSource = new EventSource('/api/generate', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setProgress(data);
        } else if (data.type === 'result') {
          setResult(data);
          eventSource.close();
        }
      };
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };
  
  return (
    <div>
      {/* Form inputs */}
      <button onClick={generateWebsite}>Generate Website</button>
      
      {progress && (
        <div>Progress: {progress.percentage}% - {progress.message}</div>
      )}
      
      {result?.success && (
        <div>Generated successfully! Files: {result.generatedFiles?.length}</div>
      )}
    </div>
  );
};
```

## API Endpoints

When using the Express.js server (`api-server.js`):

- `GET /api/schema` - Get input validation schema
- `POST /api/validate` - Validate input without generating
- `POST /api/generate` - Generate with progress (Server-Sent Events)
- `POST /api/generate/sync` - Generate synchronously
- `GET /api/generations` - List active generations
- `GET /api/generations/:id` - Get generation status
- `GET /api/health` - Health check

## Validation Rules

### Field Constraints
- `primaryKeyword`: 2-50 characters, alphanumeric + Turkish chars
- `brandName`: 2-100 characters, alphanumeric + Turkish chars + basic symbols
- `secondaryKeywords`: Max 10 items, each max 30 characters
- `focusAreas`: Max 8 items, must be from allowed list
- `targetLanguage`: Must be one of: tr, en, de, fr, es, ru

### Allowed Focus Areas
- güvenlik (security)
- mobil (mobile)
- destek (support)
- bonus (bonus)
- hızlı (fast)
- casino (casino)
- spor (sports)
- canlı (live)
- ödeme (payment)
- lisans (license)
- vip (VIP)
- promosyon (promotion)

## Error Handling

The system provides structured error responses:

```javascript
{
  success: false,
  error: "Error message",
  errorType: "validation|generation",
  logs: { /* generation logs */ }
}
```

### Error Types
- `validation`: Input validation failed
- `generation`: Generation process failed

## Progress Tracking

Progress callbacks provide real-time updates:

```javascript
{
  step: "structure_generation",
  percentage: 30,
  message: "Generating website structure",
  data: { /* additional step data */ }
}
```

### Progress Steps
1. `validation` (5%) - Validating input
2. `initialization` (10%) - Initializing pipeline
3. `structure_generation` (30%) - Generating structure
4. `content_generation` (60%) - Generating content
5. `html_combination` (80%) - Combining components
6. `finalization` (95%) - Finalizing files
7. `completed` (100%) - Generation complete

## Advanced Configuration

### Custom Defaults

```javascript
const { InputProcessor } = require('./services/input/input-processor.service');

const processor = new InputProcessor();

// Modify defaults
processor.defaults.focusAreas = ['custom', 'focus', 'areas'];
processor.defaults.targetLanguage = 'en';

const processed = processor.process(rawInput);
```

### Custom Validation Rules

```javascript
// Add custom validation
processor.validationRules.customField = {
  minLength: 5,
  maxLength: 50,
  pattern: /^[a-zA-Z0-9]+$/
};
```

## Integration Benefits

1. **Simplified Integration**: Clean, predictable interface
2. **Built-in Validation**: Comprehensive input validation
3. **Progress Tracking**: Real-time generation updates
4. **Error Handling**: Structured error responses
5. **Flexibility**: Support for various input formats
6. **Documentation**: Auto-generated API schemas
7. **Type Safety**: TypeScript-ready with JSDoc types

## Files Overview

- `services/input/input-processor.service.js` - Core input processing
- `services/api/generator-api.service.js` - API wrapper service
- `api-server.js` - Express.js API server example
- `cli-api.js` - Abstracted CLI interface
- `simple-cli.js` - Minimal usage example
- `frontend-example/src/HTMLGeneratorApp.jsx` - React frontend example

This abstraction system makes the HTML generator much more accessible for building APIs, web interfaces, and integrating with other systems while maintaining the robust functionality of the underlying services.
