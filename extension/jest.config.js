module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    "^~(.*)$": "<rootDir>/$1"
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      tsconfig: 'tsconfig.test.json',
      useESM: true 
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.spec.(ts|tsx)'],
  testPathIgnorePatterns: ['<rootDir>/__tests__/e2e/'],
  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'routes/**/*.{ts,tsx}',
    'background/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.d.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
}; 