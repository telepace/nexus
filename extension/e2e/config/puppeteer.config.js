// extension/e2e/config/puppeteer.config.js
module.exports = {
  headless: process.env.HEADLESS !== 'false', // Allow overriding via environment variable
  slowMo: parseInt(process.env.SLOWMO || '50', 10), // Default to 50ms, allow override
  devtools: process.env.DEVTOOLS === 'true',
  args: [
    // '--disable-extensions-except=./extension/build', // Path to the built extension
    // '--load-extension=./extension/build',             // Path to the built extension
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Recommended for CI environments
  ],
  defaultViewport: {
    width: 1280,
    height: 800,
  },
  // Add path to chrome executable if needed, e.g. for CI
  // executablePath: process.env.CHROME_BIN || undefined
};
