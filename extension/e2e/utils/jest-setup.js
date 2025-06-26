// Global Jest setup for Puppeteer and extension testing

// Increase timeout for async operations significantly  
jest.setTimeout(120000); // 2 minutes for E2E tests

// Set up environment variables for testing
process.env.NODE_ENV = 'test';

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global setup for all tests
beforeAll(async () => {
  // Any global setup can go here
  console.log('Starting E2E test suite...');
});

afterAll(async () => {
  // Any global cleanup can go here
  console.log('E2E test suite completed.');
  
  // Force cleanup any remaining handles
  if (global.gc) {
    global.gc();
  }
}); 