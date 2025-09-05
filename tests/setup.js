// Global test setup
require('dotenv').config({ path: '.env.test' });

// Mock console methods for cleaner test output
global.mockConsole = () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
};

global.restoreConsole = () => {
  console.log.mockRestore?.();
  console.error.mockRestore?.();
  console.warn.mockRestore?.();
};

// Global test timeout
jest.setTimeout(30000);

// Mock OpenAI API key for tests
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-api-key';
