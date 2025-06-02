// extension/e2e/pages/DashboardPage.js
const testConfig = require('../config/test.config');

class DashboardPage {
  constructor(page) {
    if (!page) throw new Error("Puppeteer Page instance is required for DashboardPage.");
    this.page = page;
    // Selectors - these are placeholders for elements on the actual dashboard web page
    this.headerTitle = 'h1.dashboard-title'; // Example: <h1>Dashboard</h1>
    this.welcomeMessage = '#dashboard-welcome-message'; // Example
    this.itemsList = '#dashboard-items-list'; // Example
  }

  async waitForLoad(timeout = testConfig.defaultTimeout) {
    if (!this.page) throw new Error("Page not initialized for DashboardPage.");
    // Wait for a key element that indicates the dashboard has loaded.
    await this.page.waitForSelector(this.headerTitle, { visible: true, timeout });
  }

  async getHeaderText() {
    if (!this.page) throw new Error("Page not initialized for DashboardPage.");
    await this.page.waitForSelector(this.headerTitle, { visible: true, timeout: testConfig.defaultTimeout });
    const element = await this.page.$(this.headerTitle);
    return this.page.evaluate(el => el.textContent, element);
  }

  async isItemsListPresent() {
    if (!this.page) throw new Error("Page not initialized for DashboardPage.");
    try {
      await this.page.waitForSelector(this.itemsList, { visible: true, timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Add other methods to interact with or verify dashboard content as needed
}

module.exports = DashboardPage;
