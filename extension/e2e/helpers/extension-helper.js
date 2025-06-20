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
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-popup-blocking',
      '--disable-translate',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection'
    ];

    this.browser = await puppeteer.launch({ ...puppeteerConfig, args });
    
    console.log('Waiting for extension to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
      await this.getExtensionId(3);
      console.log('Extension loaded successfully');
    } catch (error) {
      console.warn('Extension loading verification failed:', error.message);
    }
    
    return this.browser;
  }

  async getExtensionId(retries = 3) {
    if (this.extensionId) return this.extensionId;
    if (!this.browser) throw new Error('Browser not launched. Call launchBrowser() first.');

    for (let attempt = 1; attempt <= retries; attempt++) {
      console.log(`Attempting to find extension service worker (attempt ${attempt}/${retries})`);
      
      const targets = this.browser.targets();
      console.log(`Available targets: ${targets.map(t => `${t.type()}:${t.url()}`).join(', ')}`);
      
      let extensionTarget = null;
      
      extensionTarget = targets.find(target =>
          target.type() === 'service_worker' &&
          target.url().startsWith('chrome-extension://') &&
          !target.url().includes('null')
      );
      
      if (!extensionTarget) {
        extensionTarget = targets.find(target =>
            target.type() === 'page' &&
            target.url().includes('sidepanel.html') &&
            target.url().startsWith('chrome-extension://') &&
            !target.url().includes('null')
        );
      }
      
      if (!extensionTarget) {
        const extensionPages = targets.filter(target =>
            target.url().startsWith('chrome-extension://') &&
            !target.url().includes('null')
        );
        
        if (extensionPages.length > 0) {
          extensionTarget = extensionPages[0];
        }
      }

      if (extensionTarget) {
        const url = extensionTarget.url();
        const match = url.match(/chrome-extension:\/\/([a-z]+)/);
        if (match && match[1] !== 'null') {
          this.extensionId = match[1];
          console.log(`Found extension ID: ${this.extensionId} from URL: ${url}`);
          return this.extensionId;
        }
      }

      if (attempt < retries) {
        console.log(`Extension not found, waiting 3 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const tempPage = await this.browser.newPage();
          await tempPage.goto('chrome://extensions/', { waitUntil: 'networkidle2', timeout: 5000 });
          await tempPage.close();
        } catch (e) {
          // 忽略错误
        }
      }
    }

    throw new Error('Extension background page or service worker not found. Ensure the extension is loaded correctly.');
  }

  async getBackgroundPage() {
    if (this.backgroundPage) return this.backgroundPage;
    if (!this.browser) throw new Error('Browser not launched.');
    if (!this.extensionId) await this.getExtensionId();

    const targets = this.browser.targets();
    const backgroundTarget = targets.find(
        (target) =>
        (target.type() === 'service_worker' || target.type() === 'background_page') &&
        target.url().includes(this.extensionId)
    );

    if (!backgroundTarget) {
      throw new Error('Could not find background page or service worker for the extension.');
    }

    if (backgroundTarget.type() === 'background_page') {
        this.backgroundPage = await backgroundTarget.page();
    } else {
        this.backgroundPage = backgroundTarget;
        console.log('Extension is using a service worker. Background page interactions will be limited.');
    }
    return this.backgroundPage;
  }

  async openSidePanel() {
    if (!this.browser) throw new Error('Browser not launched.');
    
    try {
      await this.getExtensionId();
    } catch (error) {
      console.warn('Failed to get extension ID, trying alternative approach...');
      
      const pages = await this.browser.pages();
      const existingSidePanelPage = pages.find(page => 
        page.url().includes('sidepanel.html') && 
        !page.url().includes('null')
      );
      
      if (existingSidePanelPage) {
        console.log('Found existing side panel page:', existingSidePanelPage.url());
        const match = existingSidePanelPage.url().match(/chrome-extension:\/\/([a-z]+)/);
        if (match && match[1] !== 'null') {
          this.extensionId = match[1];
          console.log(`Extracted extension ID from existing page: ${this.extensionId}`);
          return existingSidePanelPage;
        }
      }
      
      throw error;
    }

    const sidePanelUrl = `chrome-extension://${this.extensionId}/sidepanel.html`;
    console.log(`Opening side panel at: ${sidePanelUrl}`);

    const newPage = await this.browser.newPage();
    try {
      await newPage.goto(sidePanelUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    console.log('Waiting for extension to be ready (placeholder)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async clearExtensionStorage() {
    if (!this.browser) throw new Error('Browser not launched.');
    
    try {
      const sidePanelUrl = `chrome-extension://${this.extensionId}/sidepanel.html`;
      const tempPage = await this.browser.newPage();
      
      await tempPage.goto(sidePanelUrl, { waitUntil: 'networkidle2' });
      
      await tempPage.evaluate(async () => {
        try {
          if (chrome?.storage?.local) {
            await chrome.storage.local.clear();
            console.log('[Storage] Local storage cleared');
          }
          
          if (chrome?.storage?.sync) {
            await chrome.storage.sync.clear();
            console.log('[Storage] Sync storage cleared');
          }
          
          if (window.localStorage) {
            window.localStorage.clear();
            console.log('[Storage] LocalStorage cleared');
          }
          
          if (window.sessionStorage) {
            window.sessionStorage.clear();
            console.log('[Storage] SessionStorage cleared');
          }
        } catch (error) {
          console.log('[Storage] Clear error:', error.message);
        }
      });
      
      await tempPage.close();
      console.log('Extension storage cleared successfully');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.warn('Failed to clear extension storage:', error.message);
    }
  }

  async mockLoginState(options = {}, page = null) {
    if (!this.browser) throw new Error('Browser not launched.');
    
    const {
      email = 'test@example.com',
      token = 'mock-jwt-token-for-testing',
      userId = 'mock-user-id-123',
      fullName = 'Test User'
    } = options;
    
    try {
      console.log(`[ExtensionHelper] Setting mock login state for: ${email}`);
      
      let targetPage = page;
      let shouldClosePage = false;
      
      if (!targetPage) {
        const sidePanelUrl = `chrome-extension://${this.extensionId}/sidepanel.html`;
        targetPage = await this.browser.newPage();
        await targetPage.goto(sidePanelUrl, { waitUntil: 'networkidle2' });
        shouldClosePage = true;
      }
      
      await targetPage.evaluate(async (authData) => {
        try {
          const { email, token, userId, fullName } = authData;
          
          if (chrome?.storage?.local) {
            await chrome.storage.local.set({
              accessToken: token,
              user: {
                id: userId,
                email: email,
                full_name: fullName,
                is_active: true,
                is_superuser: false
              }
            });
            console.log('[MockAuth] Authentication data set in chrome.storage.local');
          }
          
          if (window.localStorage) {
            window.localStorage.setItem('nexus_auth_token', token);
            window.localStorage.setItem('nexus_user', JSON.stringify({
              id: userId,
              email: email,
              full_name: fullName
            }));
            console.log('[MockAuth] Authentication data set in localStorage');
          }
          
          if (chrome?.runtime?.sendMessage) {
            try {
              await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
              console.log('[MockAuth] Triggered auth state check');
            } catch (error) {
              console.log('[MockAuth] Failed to trigger auth check:', error.message);
            }
          }
          
          console.log('[MockAuth] Triggering page reload to update React state...');
          window.location.reload();
          
        } catch (error) {
          console.error('[MockAuth] Error setting auth data:', error.message);
          throw error;
        }
      }, { email, token, userId, fullName });
      
      if (!shouldClosePage) {
        console.log('[ExtensionHelper] Waiting for page reload after mock login...');
        await targetPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (shouldClosePage) {
        await targetPage.close();
      }
      
      console.log(`[ExtensionHelper] Mock login state set successfully for: ${email}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('[ExtensionHelper] Failed to set mock login state:', error.message);
      throw error;
    }
  }

  async verifyLoginState() {
    if (!this.browser) throw new Error('Browser not launched.');
    
    try {
      const sidePanelUrl = `chrome-extension://${this.extensionId}/sidepanel.html`;
      const tempPage = await this.browser.newPage();
      
      await tempPage.goto(sidePanelUrl, { waitUntil: 'networkidle2' });
      
      const authData = await tempPage.evaluate(async () => {
        try {
          if (chrome?.storage?.local) {
            const result = await chrome.storage.local.get(['accessToken', 'user']);
            return {
              hasToken: !!result.accessToken,
              hasUser: !!result.user,
              userEmail: result.user?.email || null,
              tokenPrefix: result.accessToken ? result.accessToken.substring(0, 20) + '...' : null
            };
          }
          return { error: 'chrome.storage.local not available' };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      await tempPage.close();
      console.log('[ExtensionHelper] Auth state verification:', authData);
      return authData;
      
    } catch (error) {
      console.error('[ExtensionHelper] Failed to verify login state:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = ExtensionHelper;
