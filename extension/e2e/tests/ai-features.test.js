// extension/e2e/tests/ai-features.test.js
const ExtensionHelper = require('../helpers/extension-helper');
const ContentPage = require('../pages/ContentPage'); // To load content that can be summarized
const SidePanelPage = require('../pages/SidePanelPage');
const mockApi = require('../utils/mock-server');
const testConfig = require('../config/test.config');

jest.setTimeout(testConfig.defaultTimeout + 40000); // AI features might take a bit longer

describe('Nexus Extension AI Features', () => {
  let extensionHelper;
  let browser;
  let webPage; // Page for loading content, e.g., simple-article.html
  let sidePanelTabPage; // Page for the extension's side panel

  let contentPageObjectModel;
  let sidePanelObjectModel;

  const simpleArticleFixture = 'fixtures/test-pages/simple-article.html';

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
    // Load a content page first, as AI features likely operate on its content
    webPage = await browser.newPage();
    contentPageObjectModel = new ContentPage(webPage);
    await contentPageObjectModel.navigateTo(simpleArticleFixture); // Load some content

    // Open side panel
    sidePanelTabPage = await extensionHelper.openSidePanel();
    await extensionHelper.waitForExtensionReady(sidePanelTabPage);
    sidePanelObjectModel = new SidePanelPage(sidePanelTabPage, extensionHelper.extensionId);
    await sidePanelObjectModel.waitForLoad();

    // Assume content is automatically extracted or available to the side panel
    // If not, add a step here to trigger extraction if necessary, e.g.,
    // await sidePanelObjectModel.clickExtractContentButton(); // If such a button exists
    // For these tests, we'll assume the content from simpleArticleFixture is somehow made available
    // to the AI features when they are triggered from the side panel.
    // A common pattern is auto-extraction on side panel open for a page with content.
    // We'll wait for a moment to simulate this.
    await sidePanelTabPage.waitForTimeout(2000); // Give time for any auto-processes
  });

  afterEach(async () => {
    if (webPage && !webPage.isClosed()) {
      await webPage.close();
    }
    if (sidePanelTabPage && !sidePanelTabPage.isClosed()) {
      await sidePanelTabPage.close();
    }
    // Screenshot on failure
    if (expect.getState().currentTestName && expect.getState().assertionCalls === 0 && expect.getState().suppressedErrors.length > 0) {
        const testName = expect.getState().currentTestName.replace(/\s+/g, '-').toLowerCase();
        const screenshotDir = testConfig.screenshotsPath || './screenshots';
        const fs = require('fs');
        if (!fs.existsSync(screenshotDir)) { fs.mkdirSync(screenshotDir, { recursive: true }); }
        const spScreenshotPath = `${screenshotDir}/${testName}-sidepanel-failure.png`;
        if (sidePanelTabPage && !sidePanelTabPage.isClosed()) {
             await sidePanelTabPage.screenshot({ path: spScreenshotPath });
             console.log(`Screenshot of side panel saved to ${spScreenshotPath} due to test failure.`);
        }
    }
  });

  // Test Scenario 6: Smart Summary Generation
  it('should generate and display a smart summary for the current page content', async () => {
    await sidePanelObjectModel.clickSummarizeButton();

    // Wait for API call and UI update
    // The mock API for /ai/summarize returns:
    // { summary: 'This is a mock summary of the provided content.' }
    const summaryText = await sidePanelObjectModel.getSummaryResultsText(10000); // Wait up to 10s for result
    expect(summaryText).toContain('This is a mock summary');
  });

  // Test Scenario 7: Key Points Extraction
  it('should extract and display key points for the current page content', async () => {
    await sidePanelObjectModel.clickKeypointsButton();

    // Wait for API call and UI update
    // The mock API for /ai/extract-keypoints returns:
    // { keypoints: ['Mock Keypoint 1', 'Mock Keypoint 2'] }
    const keypointsText = await sidePanelObjectModel.getKeypointsResultsText(10000);
    expect(keypointsText).toContain('Mock Keypoint 1');
    expect(keypointsText).toContain('Mock Keypoint 2');
  });

  // Test Scenario 8: Save to Knowledge Base
  it('should allow saving the page content to the knowledge base and show confirmation', async () => {
    await sidePanelObjectModel.clickSaveToLibraryButton();

    // Wait for API call and UI update (e.g., a success message)
    // The mock API for /library/save returns:
    // { message: 'Content saved to library successfully (mocked).', id: ... }
    const statusMessage = await sidePanelObjectModel.getSaveStatusMessage(10000);
    expect(statusMessage).toContain('Content saved to library successfully (mocked)');
    // Optionally, verify the mock API was called with expected data if the mock server can record calls.
  });
});
