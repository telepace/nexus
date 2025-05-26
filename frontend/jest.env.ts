/**
 * Jest environment setup file
 * This file is loaded before each test to set up environment variables
 */

// Jest environment setup
// This file is used to set up environment variables for Jest testing

// Set up environment variables for testing
Object.defineProperty(process.env, "NODE_ENV", {
  value: "test",
  writable: true,
  configurable: true,
});

Object.defineProperty(process.env, "NEXT_PUBLIC_API_URL", {
  value: "http://localhost:8000",
  writable: true,
  configurable: true,
});

Object.defineProperty(process.env, "NEXT_PUBLIC_FRONTEND_URL", {
  value: "http://localhost:3000",
  writable: true,
  configurable: true,
});

// Mock environment variables that might be needed for tests
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  // Suppress specific warnings that are expected in test environment
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("Warning: ReactDOM.render is deprecated") ||
      args[0].includes("Warning: componentWillReceiveProps has been renamed"))
  ) {
    return;
  }
  originalWarn(...args);
};

// Export empty object to make this a module
export {};
