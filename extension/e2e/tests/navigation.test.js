// extension/e2e/tests/navigation.test.js
const ExtensionHelper = require('../helpers/extension-helper');
const SidePanelPage = require('../pages/SidePanelPage');
const DashboardPage = require('../pages/DashboardPage'); // For dashboard interaction
const ContentPage = require('../pages/ContentPage'); // For context for quick actions
const mockApi = require('../utils/mock-server');
const testConfig = require('../config/test.config');

jest.setTimeout(testConfig.defaultTimeout + 30000);

describe('Nexus Extension Navigation and Quick Actions', () => {
  let extensionHelper;
  let browser;
  let sidePanelTabPage;
  let webPage; // For content context

  let sidePanelObjectModel;

  const simpleArticleFixture = 'fixtures/test-pages/simple-article.html';
  // Assume the dashboard URL is known or configured.
  // For now, let's use a placeholder. It might be part of testConfig.
  const dashboardExpectedUrlPart = '/dashboard'; // Or a full URL from config if it's fixed

  beforeAll(async () => {
    await mockApi.start();
    extensionHelper = new ExtensionHelper();
    browser = await extensionHelper.launchBrowser();
  });

  afterAll(async () => {
    if (extensionHelper) {
      await extensionHelper.closeBrowser();
    }
    await mockApi.stop();
  });

  beforeEach(async () => {
    // Open side panel first
    sidePanelTabPage = await extensionHelper.openSidePanel();
    await extensionHelper.waitForExtensionReady(sidePanelTabPage);
    sidePanelObjectModel = new SidePanelPage(sidePanelTabPage, extensionHelper.extensionId);
    await sidePanelObjectModel.waitForLoad();

    // Load a content page for context if quick actions need it
    webPage = await browser.newPage();
    const contentPageObjectModel = new ContentPage(webPage);
    await contentPageObjectModel.navigateTo(simpleArticleFixture);
    // Give a moment for the extension to recognize the content page context
    await sidePanelTabPage.waitForTimeout(1000);
  });

  afterEach(async () => {
    if (sidePanelTabPage && !sidePanelTabPage.isClosed()) {
      await sidePanelTabPage.close();
    }
    if (webPage && !webPage.isClosed()) {
      await webPage.close();
    }
    // Screenshot on failure
    if (expect.getState().currentTestName && expect.getState().assertionCalls === 0 && expect.getState().suppressedErrors.length > 0) {
        const testName = expect.getState().currentTestName.replace(/\s+/g, '-').toLowerCase();
        const screenshotDir = testConfig.screenshotsPath || './screenshots';
        const fs = require('fs');
        if (!fs.existsSync(screenshotDir)) { fs.mkdirSync(screenshotDir, { recursive: true }); }
        const spScreenshotPath = `${screenshotDir}/${testName}-sidepanel-nav-failure.png`;
        if (sidePanelTabPage && !sidePanelTabPage.isClosed()) {
             await sidePanelTabPage.screenshot({ path: spScreenshotPath });
             console.log(`Screenshot of side panel saved to ${spScreenshotPath} due to test failure.`);
        }
    }
  });

  // Test Scenario 9: Open Dashboard
  it('should open the dashboard in a new tab when "Open Dashboard" is clicked', async () => {
    // Ensure the dashboard link selector is in SidePanelPage.js (it was: this.dashboardLink)
    // const dashboardLink = await sidePanelObjectModel.getDashboardLinkElement(); // Assuming method exists

    const initialPages = await browser.pages();

    // Create a promise that resolves when a new page (target) is created
    const newPagePromise = new Promise(resolve => browser.once('targetcreated', async target => {
        if (target.type() === 'page') {
            const newPage = await target.page();
            resolve(newPage);
        }
    }));

    await sidePanelObjectModel.clickDashboardLink();

    const dashboardTabPage = await newPagePromise; // Wait for the new tab to open
    expect(dashboardTabPage).not.toBeNull();

    const dashboardObjectModel = new DashboardPage(dashboardTabPage);
    await dashboardObjectModel.waitForLoad(); // Wait for dashboard content

    expect(dashboardTabPage.url()).toContain(dashboardExpectedUrlPart);
    // Example assertion for dashboard content:
    expect(await dashboardObjectModel.getHeaderText()).toBeTruthy(); // Or check for specific text

    await dashboardTabPage.close(); // Clean up the new tab
  });

  // Test Scenario 10: Quick Actions
  describe('Quick Actions from Side Panel', () => {
    it('should perform "AI Summarize" quick action correctly', async () => {
      // This reuses the "summarize" functionality tested in ai-features.test.js
      // but framed as a "quick action".
      await sidePanelObjectModel.clickSummarizeButton();
      const summaryText = await sidePanelObjectModel.getSummaryResultsText(10000);
      expect(summaryText).toContain('This is a mock summary'); // From mock API
    });

    it('should perform "Save Page" (to library) quick action correctly', async () => {
      // This reuses the "save to library" functionality.
      await sidePanelObjectModel.clickSaveToLibraryButton();
      const statusMessage = await sidePanelObjectModel.getSaveStatusMessage(10000);
      expect(statusMessage).toContain('Content saved to library successfully (mocked)'); // From mock API
    });
  });
});
