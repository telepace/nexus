// extension/e2e/pages/LoginPage.js
const testConfig = require('../config/test.config');

class LoginPage {
  constructor(page) {
    if (!page) throw new Error("Puppeteer Page instance is required for LoginPage.");
    this.page = page;
    // Selectors - these are placeholders and need to be updated with actual selectors from the extension's HTML.
    this.emailInput = '#nexus-login-email'; // Example selector
    this.passwordInput = '#nexus-login-password'; // Example selector
    this.loginButton = '#nexus-login-submit'; // Example selector
    this.errorMessage = '.nexus-login-error-message'; // Example selector for error messages
    this.syncLoginButton = '#nexus-sync-login-button'; // Example for "Sync Login"
  }

  async navigate() {
    // This might not be needed if login is always within the side panel.
    // If there's a dedicated login page URL for the extension, use it here.
    // For now, assume the login form is part of another page (e.g., side panel).
    console.log('LoginPage: Navigate method called, but assumes login form is already visible or part of sidepanel.');
  }

  async login(email, password) {
    if (!this.page) throw new Error("Page not initialized for LoginPage.");
    await this.page.waitForSelector(this.emailInput, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.type(this.emailInput, email);
    await this.page.type(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }

  async clickSyncLogin() {
    if (!this.page) throw new Error("Page not initialized for LoginPage.");
    await this.page.waitForSelector(this.syncLoginButton, { visible: true, timeout: testConfig.defaultTimeout });
    await this.page.click(this.syncLoginButton);
  }

  async getErrorMessage() {
    if (!this.page) throw new Error("Page not initialized for LoginPage.");
    await this.page.waitForSelector(this.errorMessage, { visible: true, timeout: 5000 }).catch(() => null); // Wait briefly
    const errorElement = await this.page.$(this.errorMessage);
    if (errorElement) {
      return this.page.evaluate(element => element.textContent, errorElement);
    }
    return null;
  }

  async isLoginFormVisible(timeout = testConfig.defaultTimeout) {
    try {
      await this.page.waitForSelector(this.emailInput, { visible: true, timeout });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = LoginPage;
