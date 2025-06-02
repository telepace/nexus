// extension/e2e/jest.config.js
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  roots: ['<rootDir>/tests'], // Points to the 'tests' folder within 'e2e'
  testTimeout: 60000, // Increased default timeout for E2E tests (can be overridden in test files)
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
  // Optional: if screenshots are taken by tests, Jest doesn't need to handle them directly,
  // but you might configure a setup file for global test setup/teardown if needed.
  // setupFilesAfterEnv: ['./jest.setup.js'],
};
