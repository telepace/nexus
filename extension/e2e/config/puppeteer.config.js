// extension/e2e/config/puppeteer.config.js
module.exports = {
  headless: process.env.HEADLESS !== 'false', // Allow overriding via environment variable
  slowMo: parseInt(process.env.SLOWMO || '50', 10), // Default to 50ms, allow override
  devtools: process.env.DEVTOOLS === 'true',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Recommended for CI environments
    '--disable-web-security', // Allow cross-origin requests and extension access
    '--disable-features=VizDisplayCompositor', // Disable potential blocking features
    '--disable-blink-features=AutomationControlled', // Prevent detection as automated
    '--allow-running-insecure-content',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
    '--no-first-run',
    '--disable-client-side-phishing-detection',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-domain-reliability',
    '--disable-features=TranslateUI',
    '--disable-plugins-discovery',
    '--disable-popup-blocking', // Allow extension popups
    '--allow-running-insecure-content',
    // Extension-specific args
    '--enable-extensions', // Explicitly enable extensions
    '--disable-extensions-except', // Will be set dynamically by ExtensionHelper
    '--load-extension' // Will be set dynamically by ExtensionHelper
  ],
  defaultViewport: {
    width: 1280,
    height: 800,
  },
  // Add path to chrome executable if needed, e.g. for CI
  // executablePath: process.env.CHROME_BIN || undefined
};
