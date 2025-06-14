module.exports = {
  headless: process.env.HEADLESS !== 'false', // Allow overriding via environment variable
  slowMo: parseInt(process.env.SLOWMO || '50', 10), // Default to 50ms, allow override
  devtools: process.env.DEVTOOLS === 'true',
  args: [
    // Extension loading flags
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Recommended for CI environments
    '--disable-web-security', // Allow extension to work with local files
    '--allow-running-insecure-content',
    '--disable-features=TranslateUI',
    '--disable-extensions-except', // This will be completed in ExtensionHelper
    '--load-extension', // This will be completed in ExtensionHelper
    '--disable-default-apps',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--user-data-dir=/tmp/chrome-test-profile',
    '--enable-logging',
    '--v=1'
  ],
  defaultViewport: {
    width: 1280,
    height: 800,
  },
  // Add path to chrome executable if needed, e.g. for CI
  // executablePath: process.env.CHROME_BIN || undefined
}; 