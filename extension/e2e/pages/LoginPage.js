// extension/e2e/pages/LoginPage.js
const testConfig = require('../config/test.config');

class LoginPage {
  constructor(page) {
    if (!page) throw new Error("Puppeteer Page instance is required for LoginPage.");
    this.page = page;
    // 更新选择器以匹配实际的LoginForm组件
    this.emailInput = 'input[type="email"]#email'; // 邮箱输入框
    this.passwordInput = 'input[type="password"]#password'; // 密码输入框
    this.loginButton = 'button[type="submit"]'; // 登录按钮
    this.errorMessage = '.text-red-800'; // 错误消息
    this.syncLoginButton = 'button:has-text("一键同步登录状态")'; // 同步登录按钮
    this.successMessage = '.text-green-800'; // 成功消息
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
    
    // 清空并输入邮箱
    await this.page.click(this.emailInput, { clickCount: 3 }); // 选中所有文本
    await this.page.type(this.emailInput, email);
    
    // 清空并输入密码
    await this.page.click(this.passwordInput, { clickCount: 3 }); // 选中所有文本
    await this.page.type(this.passwordInput, password);
    
    await this.page.click(this.loginButton);
  }

  async clickSyncLogin() {
    if (!this.page) throw new Error("Page not initialized for LoginPage.");
    // 使用更通用的选择器
    const syncButton = await this.page.waitForSelector('button', { visible: true, timeout: testConfig.defaultTimeout });
    const buttons = await this.page.$$('button');
    
    for (const button of buttons) {
      const text = await this.page.evaluate(el => el.textContent, button);
      if (text.includes('同步') || text.includes('sync')) {
        await button.click();
        return;
      }
    }
    
    throw new Error('Sync login button not found');
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

  async waitForLoginSuccess(timeout = testConfig.defaultTimeout) {
    try {
      // 等待成功消息出现
      await this.page.waitForSelector(this.successMessage, { visible: true, timeout });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = LoginPage;
