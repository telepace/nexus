// extension/e2e/helpers/extension-helper.js
const puppeteer = require('puppeteer');
const puppeteerConfig = require('../config/puppeteer.config');
const testConfig = require('../config/test.config');
const path = require('path');

class ExtensionHelper {
  constructor() {
    this.browser = null;
    this.extensionId = null;
    this.backgroundPage = null;
  }

  async launchBrowser() {
    const extensionPath = path.resolve(process.cwd(), testConfig.extensionBuildPath);
    console.log(`Attempting to load extension from: ${extensionPath}`);

    const args = [
      ...puppeteerConfig.args,
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ];

    this.browser = await puppeteer.launch({ ...puppeteerConfig, args });
    return this.browser;
  }

  async getExtensionId() {
    if (this.extensionId) return this.extensionId;
    if (!this.browser) throw new Error('Browser not launched. Call launchBrowser() first.');

    const targets = this.browser.targets();
    // Find the service worker or background page target for the extension
    const extensionTarget = targets.find(target =>
        (target.type() === 'service_worker' || target.type() === 'background_page') &&
        target.url().startsWith('chrome-extension://')
    );

    if (!extensionTarget) {
      throw new Error('Extension background page or service worker not found. Ensure the extension is loaded correctly.');
    }

    const url = extensionTarget.url();
    this.extensionId = url.split('/')[2];
    console.log(`Found extension ID: ${this.extensionId}`);
    return this.extensionId;
  }

  async getBackgroundPage() {
    if (this.backgroundPage) return this.backgroundPage;
    if (!this.browser) throw new Error('Browser not launched.');
    if (!this.extensionId) await this.getExtensionId();

    // For Manifest V3, extensions use service workers.
    // For Manifest V2, they use background pages.
    const targets = this.browser.targets();
    const backgroundTarget = targets.find(
        (target) =>
        (target.type() === 'service_worker' || target.type() === 'background_page') &&
        target.url().includes(this.extensionId)
    );

    if (!backgroundTarget) {
      throw new Error('Could not find background page or service worker for the extension.');
    }

    // For service workers, you might not get a "page" object in the traditional sense.
    // Interaction might be limited to what the service worker exposes.
    // For background pages (MV2), this will be a Page object.
    if (backgroundTarget.type() === 'background_page') {
        this.backgroundPage = await backgroundTarget.page();
    } else {
        // For service workers, direct page interaction is different.
        // We store the target itself for potential future use (e.g., evaluating scripts if needed)
        // but direct DOM manipulation isn't applicable like with a page.
        this.backgroundPage = backgroundTarget;
        console.log('Extension is using a service worker. Background page interactions will be limited.');
    }
    return this.backgroundPage;
  }

  async openSidePanel() {
    if (!this.browser) throw new Error('Browser not launched.');
    if (!this.extensionId) await this.getExtensionId();

    const sidePanelUrl = `chrome-extension://${this.extensionId}/sidepanel.html`;
    console.log(`Opening side panel at: ${sidePanelUrl}`);

    const newPage = await this.browser.newPage();
    try {
      await newPage.goto(sidePanelUrl, { waitUntil: 'networkidle2' });
    } catch (error) {
      console.error(`Error navigating to side panel: ${sidePanelUrl}`, error);
      await newPage.close();
      throw error;
    }
    return newPage;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.extensionId = null;
      this.backgroundPage = null;
    }
  }

  async waitForExtensionReady(page, timeout = testConfig.defaultTimeout) {
    // This is a placeholder. Specific logic to determine if the extension is "ready"
    // will depend on the extension's UI and initialization process.
    // For example, waiting for a specific element in the side panel to be visible.
    console.log('Waiting for extension to be ready (placeholder)...');
    // Example: await page.waitForSelector('#some-element-that-indicates-ready', { visible: true, timeout });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Replace with actual readiness check
  }
}

module.exports = ExtensionHelper;
