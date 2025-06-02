// extension/e2e/config/test.config.js
module.exports = {
  extensionBuildPath: './extension/build', // Placeholder, adjust as needed
  testsBaseUrl: 'http://localhost:3000', // Example, if test pages are served
  mockApiBaseUrl: 'http://localhost:3001/api/v1', // Example for mock server
  defaultTimeout: 30000, // Default timeout for Jest tests
  screenshotsPath: './extension/e2e/screenshots', // Path to save screenshots on failure
  // Add other environment-specific settings here
  // e.g., test user credentials (use environment variables for these)
  testUser: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'password123',
  }
};
