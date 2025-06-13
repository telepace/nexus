// extension/e2e/pages/ContentPage.js
const testConfig = require('../config/test.config');

class ContentPage {
  constructor(page) {
    if (!page) throw new Error("Puppeteer Page instance is required for ContentPage.");
    this.page = page;
    // Selectors for interacting with the *extension's UI* when it overlays or interacts
    // with a content page. These are placeholders.
    this.manualExtractButton = '#nexus-manual-extract-button'; // e.g., a button injected by the extension
    this.extractionStatusIndicator = '#nexus-extraction-status'; // e.g., a status message
  }

  async navigateTo(url) {
    if (!this.page) throw new Error("Page not initialized for ContentPage.");
    // Ensure full URL for local fixture files
    let fullUrl = url;
    if (url.startsWith('fixtures/')) {
        // Construct correct file path URL from current e2e directory
        const path = require('path');
        fullUrl = 'file://' + path.resolve(process.cwd(), url);
    } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        fullUrl = `http://${url}`; // Default to http if no scheme
    }

    console.log(`ContentPage: Navigating to ${fullUrl}`);
    await this.page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: testConfig.defaultTimeout });
  }

  async getTitle() {
    if (!this.page) throw new Error("Page not initialized for ContentPage.");
    return this.page.title();
  }

  async getBodyText() {
    if (!this.page) throw new Error("Page not initialized for ContentPage.");
    return this.page.evaluate(() => document.body.innerText);
  }

  // Example: a method to trigger manual extraction if the extension adds a button to the page
  async clickManualExtract() {
    if (!this.page) throw new Error("Page not initialized for ContentPage.");
    // This assumes the extension injects such a button onto the content page.
    // This selector will likely need to be identified from the actual extension's behavior.
    await this.page.waitForSelector(this.manualExtractButton, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.manualExtractButton);
  }

  async getExtractionStatus(timeout = 5000) {
    if (!this.page) throw new Error("Page not initialized for ContentPage.");
    try {
        await this.page.waitForSelector(this.extractionStatusIndicator, { visible: true, timeout });
        const statusElement = await this.page.$(this.extractionStatusIndicator);
        return this.page.evaluate(element => element.textContent, statusElement);
    } catch (error) {
        console.warn("Extraction status indicator not found.");
        return null;
    }
  }
}

module.exports = ContentPage;
