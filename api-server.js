/**
 * Express.js API Server Example
 * Demonstrates how to use the abstracted input system for web APIs
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const GeneratorAPI = require('./services/api/generator-api.service');

const app = express();
const generatorAPI = new GeneratorAPI();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  }
});

app.use('/api/', limiter);

/**
 * GET /api/schema
 * Get input validation schema for frontend
 */
app.get('/api/schema', (req, res) => {
  try {
    const schema = generatorAPI.getInputSchema();
    res.json({
      success: true,
      schema
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get schema'
    });
  }
});

/**
 * POST /api/validate
 * Validate input without generating
 */
app.post('/api/validate', (req, res) => {
  try {
    const validation = generatorAPI.validateInput(req.body);
    res.json({
      success: true,
      ...validation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
});

/**
 * POST /api/generate
 * Generate website with progress tracking
 */
app.post('/api/generate', async (req, res) => {
  try {
    // Set up Server-Sent Events for progress tracking
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Progress callback
    const onProgress = (progress) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
    };

    // Generate website
    const result = await generatorAPI.generate(req.body, onProgress);

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`);
    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: error.message 
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/generate/sync
 * Generate website synchronously (no progress tracking)
 */
app.post('/api/generate/sync', async (req, res) => {
  try {
    const result = await generatorAPI.generate(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/generations
 * Get all active generations
 */
app.get('/api/generations', (req, res) => {
  try {
    const generations = generatorAPI.getActiveGenerations();
    res.json({
      success: true,
      generations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get generations'
    });
  }
});

/**
 * GET /api/generations/:id
 * Get specific generation status
 */
app.get('/api/generations/:id', (req, res) => {
  try {
    const generation = generatorAPI.getGenerationStatus(req.params.id);
    if (!generation) {
      return res.status(404).json({
        success: false,
        error: 'Generation not found'
      });
    }

    res.json({
      success: true,
      generation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get generation status'
    });
  }
});

/**
 * GET /api/generations/:id/logs
 * Get generation logs
 */
app.get('/api/generations/:id/logs', (req, res) => {
  try {
    const logs = generatorAPI.getGenerationLogs(req.params.id);
    if (!logs) {
      return res.status(404).json({
        success: false,
        error: 'Generation not found'
      });
    }

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get generation logs'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * 404 handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Cleanup old generations every hour
setInterval(() => {
  generatorAPI.cleanupGenerations();
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 HTML Generator API Server running on port ${PORT}`);
  console.log(`📚 API Documentation:`);
  console.log(`   GET  /api/health           - Health check`);
  console.log(`   GET  /api/schema           - Get input schema`);
  console.log(`   POST /api/validate         - Validate input`);
  console.log(`   POST /api/generate         - Generate with progress (SSE)`);
  console.log(`   POST /api/generate/sync    - Generate synchronously`);
  console.log(`   GET  /api/generations      - List active generations`);
  console.log(`   GET  /api/generations/:id  - Get generation status`);
});

module.exports = app;
