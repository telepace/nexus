// extension/e2e/tests/auth.test.js
const ExtensionHelper = require('../helpers/extension-helper');
const LoginPage = require('../pages/LoginPage');
const SidePanelPage = require('../pages/SidePanelPage');
const mockApi = require('../utils/mock-server');
const testConfig = require('../config/test.config');

// Set a longer timeout for E2E tests
jest.setTimeout(testConfig.defaultTimeout + 20000); // e.g., 50 seconds

describe('Nexus Extension Authentication', () => {
  let extensionHelper;
  let browser;
  let sidePanelPageInstance; // To hold the Puppeteer page object for the side panel
  let loginPage;
  let sidePanelObjectModel; // To hold the SidePanelPage POM

  beforeAll(async () => {
    await mockApi.start(); // Start the mock API server
    extensionHelper = new ExtensionHelper();
    browser = await extensionHelper.launchBrowser();
  });

  afterAll(async () => {
    if (extensionHelper) {
      await extensionHelper.closeBrowser();
    }
    await mockApi.stop(); // Stop the mock API server
  });

  beforeEach(async () => {
    // Open a new side panel for each test to ensure isolation
    // Note: If opening the side panel itself logs the user out or resets state,
    // this might need adjustment.
    sidePanelPageInstance = await extensionHelper.openSidePanel();
    await extensionHelper.waitForExtensionReady(sidePanelPageInstance);

    // Initialize Page Objects with the new side panel page
    loginPage = new LoginPage(sidePanelPageInstance);
    sidePanelObjectModel = new SidePanelPage(sidePanelPageInstance, extensionHelper.extensionId);
    await sidePanelObjectModel.waitForLoad(); // Wait for side panel to be ready
  });

  afterEach(async () => {
    if (sidePanelPageInstance && !sidePanelPageInstance.isClosed()) {
      await sidePanelPageInstance.close();
    }
     // Add screenshot capture on failure
    if (expect.getState().currentTestName && expect.getState().assertionCalls === 0 && expect.getState().suppressedErrors.length > 0) {
        const testName = expect.getState().currentTestName.replace(/\s+/g, '-').toLowerCase();
        const screenshotDir = testConfig.screenshotsPath || './screenshots';
        // Ensure directory exists (basic way, consider fs-extra for robustness)
        const fs = require('fs');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = `${screenshotDir}/${testName}-failure.png`;
        if (sidePanelPageInstance && !sidePanelPageInstance.isClosed()) {
             await sidePanelPageInstance.screenshot({ path: screenshotPath });
             console.log(`Screenshot saved to ${screenshotPath} due to test failure.`);
        }
    }
  });

  describe('Direct Login and Logout', () => {
    it('should allow a user to log in successfully with correct credentials', async () => {
      expect(await sidePanelObjectModel.isLoggedIn()).toBe(false); // Verify not logged in initially
      expect(await loginPage.isLoginFormVisible()).toBe(true); // Verify login form is visible

      await loginPage.login(testConfig.testUser.email, testConfig.testUser.password);

      // Wait for navigation or UI update indicating login success
      // This might involve waiting for the login form to disappear and user info to appear
      await sidePanelPageInstance.waitForFunction(
        (loginSelector, userInfoSelector) => {
          const loginForm = document.querySelector(loginSelector);
          const userInfo = document.querySelector(userInfoSelector);
          return !loginForm && userInfo; // Login form gone, user info present
        },
        {},
        loginPage.emailInput, // Pass selector as argument
        sidePanelObjectModel.userInfoDisplay // Pass selector as argument
      );

      expect(await sidePanelObjectModel.isLoggedIn()).toBe(true);
      const userInfoText = await sidePanelObjectModel.getUserInfoText();
      // This assertion depends on how user info is displayed.
      // Adjust if it shows email, full name, etc.
      expect(userInfoText).toContain(testConfig.testUser.email.substring(0, testConfig.testUser.email.indexOf('@'))); // Example check
    });

    it('should show an error message with incorrect credentials', async () => {
      expect(await loginPage.isLoginFormVisible()).toBe(true);
      await loginPage.login('wrong@example.com', 'wrongpassword');

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).not.toBeNull();
      // This depends on the actual error message from the mock API / UI
      expect(errorMessage).toContain('Invalid credentials');
      expect(await sidePanelObjectModel.isLoggedIn()).toBe(false);
    });

    it('should allow a logged-in user to log out', async () => {
      // First, log in
      await loginPage.login(testConfig.testUser.email, testConfig.testUser.password);
      await sidePanelPageInstance.waitForFunction(
        (loginSelector, userInfoSelector) => !document.querySelector(loginSelector) && document.querySelector(userInfoSelector), {},
        loginPage.emailInput, sidePanelObjectModel.userInfoDisplay
      );
      expect(await sidePanelObjectModel.isLoggedIn()).toBe(true);

      // Now, log out
      await sidePanelObjectModel.clickLogout();

      // Wait for login form to reappear or user info to disappear
      await sidePanelPageInstance.waitForFunction(
        (loginSelector, userInfoSelector) => document.querySelector(loginSelector) && !document.querySelector(userInfoSelector), {},
        loginPage.emailInput, sidePanelObjectModel.userInfoDisplay
      );

      expect(await sidePanelObjectModel.isLoggedIn()).toBe(false);
      expect(await loginPage.isLoginFormVisible()).toBe(true);
    });
  });

  // Placeholder for "Sync Login from Web" tests - requires more setup (mocking web login)
  // describe('Sync Login from Web', () => {
  //   it('should sync login state when user is logged in on the web', async () => {
  //     // 1. Mock web login state (e.g., set a cookie, localStorage item that the extension checks)
  //     // This part is highly dependent on how the actual sync mechanism works.
  //     // For now, we'll assume it's too complex for this initial test.
  //     console.warn("Test 'Sync Login from Web' is a placeholder and needs implementation based on sync mechanism.");
  //     // 2. Open side panel
  //     // 3. Click "Sync Login" button on LoginPage
  //     // await loginPage.clickSyncLogin();
  //     // 4. Assert successful login in side panel
  //     // expect(await sidePanelObjectModel.isLoggedIn()).toBe(true);
  //   });
  // });
});
