// extension/e2e/pages/SidePanelPage.js
const testConfig = require('../config/test.config');

class SidePanelPage {
  constructor(page, extensionId) {
    if (!page) throw new Error("Puppeteer Page instance is required for SidePanelPage.");
    if (!extensionId) throw new Error("Extension ID is required for SidePanelPage.");
    this.page = page;
    this.extensionId = extensionId; // Useful if navigating directly or constructing URLs

    // Common Selectors - placeholders, update with actuals
    this.container = '#nexus-sidepanel-container'; // Main container for the side panel
    this.userInfoDisplay = '#nexus-user-info'; // Element showing logged-in user info
    this.logoutButton = '#nexus-logout-button'; // Logout button
    this.dashboardLink = '#nexus-dashboard-link'; // Link/button to open dashboard
    this.loadingSpinner = '.nexus-loading-spinner'; // Example loading indicator
    this.contentExtractionResults = '#nexus-extraction-results'; // For extracted content
    this.summarizeButton = '#nexus-summarize-button'; // Button to trigger summarization
    this.saveToLibraryButton = '#nexus-save-to-library-button'; // Button to save to library

    // Add these within the constructor:
    this.keypointsButton = '#nexus-keypoints-button'; // Placeholder
    this.summaryResults = '#nexus-summary-results'; // Placeholder
    this.keypointsResults = '#nexus-keypoints-results'; // Placeholder
    this.saveStatusMessage = '#nexus-save-status-message'; // Placeholder
  }

  // This method might be handled by ExtensionHelper.openSidePanel()
  // async navigate() {
  //   const sidePanelUrl = `chrome-extension://${this.extensionId}/sidepanel.html`;
  //   await this.page.goto(sidePanelUrl, { waitUntil: 'networkidle2' });
  //   await this.waitForLoad();
  // }

  async waitForLoad(timeout = testConfig.defaultTimeout) {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    // Wait for a general container or a key element that indicates the side panel has loaded.
    await this.page.waitForSelector(this.container, { visible: true, timeout });
    // Optionally, wait for any initial loading spinners to disappear
    try {
        await this.page.waitForSelector(this.loadingSpinner, { hidden: true, timeout: 5000 });
    } catch (e) {
        // If spinner doesn't appear or disappear, it might not be critical, log and continue
        console.log("Loading spinner not found or did not disappear, continuing...");
    }
  }

  async isLoggedIn() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    // Check for an element that only appears when logged in, e.g., user info or logout button
    try {
      await this.page.waitForSelector(this.logoutButton, { visible: true, timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUserInfoText() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.userInfoDisplay, { visible: true, timeout: testConfig.defaultTimeout });
    const userInfoElement = await this.page.$(this.userInfoDisplay);
    return this.page.evaluate(element => element.textContent, userInfoElement);
  }

  async clickLogout() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.logoutButton, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.logoutButton);
  }

  async clickDashboardLink() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.dashboardLink, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.dashboardLink);
  }

  async clickSummarizeButton() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.summarizeButton, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.summarizeButton);
  }

  async clickSaveToLibraryButton() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.saveToLibraryButton, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.saveToLibraryButton);
  }

  async getExtractedContentText() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.contentExtractionResults, { visible: true, timeout: testConfig.defaultTimeout });
    const contentElement = await this.page.$(this.contentExtractionResults);
    return this.page.evaluate(element => element.textContent, contentElement);
  }

  // Add these new methods to the class:
  async clickKeypointsButton() {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.keypointsButton, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.keypointsButton);
  }

  async getSummaryResultsText(timeout = testConfig.defaultTimeout) {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.summaryResults, { visible: true, timeout });
    const element = await this.page.$(this.summaryResults);
    return this.page.evaluate(el => el.textContent, element);
  }

  async getKeypointsResultsText(timeout = testConfig.defaultTimeout) {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    await this.page.waitForSelector(this.keypointsResults, { visible: true, timeout });
    const element = await this.page.$(this.keypointsResults);
    return this.page.evaluate(el => el.textContent, element);
  }

  async getSaveStatusMessage(timeout = testConfig.defaultTimeout) {
    if (!this.page) throw new Error("Page not initialized for SidePanelPage.");
    // Wait for the element to be present, possibly becoming visible after an action
    await this.page.waitForSelector(this.saveStatusMessage, { timeout }); // Can be hidden initially
    const element = await this.page.$(this.saveStatusMessage);
    // Check visibility if needed, or just get text content
    // For robust check, ensure it becomes visible: await this.page.waitForSelector(this.saveStatusMessage, { visible: true, timeout });
    return this.page.evaluate(el => el.textContent, element);
  }
}

module.exports = SidePanelPage;
