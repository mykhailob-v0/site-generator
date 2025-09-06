#!/usr/bin/env node

/**
 * Test script to demonstrate log verbosity levels
 * Usage: node test-log-levels.js [level]
 * Levels: minimal, standard, detailed, debug
 */

const { logLevelManager } = require('./src/utils/log-levels');
const BaseService = require('./services/base/base.service');

// Test service to demonstrate logging
class TestService extends BaseService {
  constructor() {
    super();
  }

  async demonstrateLogging() {
    this.log('This is an info message', 'info');
    this.log('This is a verbose message with details', 'verbose', { detail: 'example' });
    this.log('This is a debug message', 'debug', { debug: true });
    this.logOperation('TestOperation', { data: 'test' });
    this.logPerformance('TestPerformance', 100, { metric: 'example' });
    
    console.log('✅ Test completed');
  }
}

async function runTest() {
  const args = process.argv.slice(2);
  const level = args[0] || 'minimal';
  
  console.log(`\n🧪 Testing log level: ${level}`);
  console.log('=====================================');
  
  try {
    // Set the log level
    logLevelManager.setLevel(level);
    console.log(`📊 ${logLevelManager.getDisplayInfo()}\n`);
    
    // Create test service and run demonstration
    const testService = new TestService();
    await testService.demonstrateLogging();
    
    console.log('\n📝 Available log levels:');
    logLevelManager.getAvailableLevels().forEach(level => {
      console.log(`   ${level.name}: ${level.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
runTest();
