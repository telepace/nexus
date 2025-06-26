// extension/e2e/jest.config.js
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  roots: ['<rootDir>/tests'], // Points to the 'tests' folder within 'e2e'
  testTimeout: 60000, // Increased default timeout for E2E tests (can be overridden in test files)
  
  // Handle non-JS files
  moduleNameMapper: {
    '\\.(html|css)$': '<rootDir>/utils/file-mock.js',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  
  // Files to ignore from transformation
  transformIgnorePatterns: [
    'node_modules/(?!(some-esm-package)/)', // Add any ESM packages that need transformation
  ],
  
  reporters: [
    'default', // Keep default Jest reporter
    [
      'jest-html-reporter',
      {
        pageTitle: 'Nexus Extension E2E Test Report',
        outputPath: './test-report/index.html', // Relative to where jest is run (e2e folder)
        includeFailureMsg: true,
        includeSuiteFailure: true,
        includeConsoleLog: true, // Helpful for debugging CI failures
      },
    ],
  ],
  
  // Global setup for Puppeteer
  setupFilesAfterEnv: ['<rootDir>/utils/jest-setup.js'],
};
