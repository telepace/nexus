// extension/e2e/tests/content-extraction.test.js
const ExtensionHelper = require('../helpers/extension-helper');
const ContentPage = require('../pages/ContentPage');
const SidePanelPage = require('../pages/SidePanelPage'); // To check results in side panel
const mockApi = require('../utils/mock-server'); // If extraction involves API calls
const testConfig = require('../config/test.config');
const path = require('path');

jest.setTimeout(testConfig.defaultTimeout + 30000); // Longer timeout

describe('Nexus Extension Content Extraction', () => {
  let extensionHelper;
  let browser;
  let webPage; // Puppeteer page object for the content page (e.g., simple-article.html)
  let sidePanelTabPage; // Puppeteer page object for the side panel

  let contentPageObjectModel;
  let sidePanelObjectModel;

  const simpleArticleFixture = 'fixtures/test-pages/simple-article.html';
  const complexLayoutFixture = 'fixtures/test-pages/complex-layout.html';

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
    // Open a new regular page for content loading
    webPage = await browser.newPage();
    contentPageObjectModel = new ContentPage(webPage);

    // Open side panel - assume extraction results might appear here or be triggered from here
    sidePanelTabPage = await extensionHelper.openSidePanel();
    await extensionHelper.waitForExtensionReady(sidePanelTabPage);
    sidePanelObjectModel = new SidePanelPage(sidePanelTabPage, extensionHelper.extensionId);
    await sidePanelObjectModel.waitForLoad();
  });

  afterEach(async () => {
    if (webPage && !webPage.isClosed()) {
      await webPage.close();
    }
    if (sidePanelTabPage && !sidePanelTabPage.isClosed()) {
      await sidePanelTabPage.close();
    }
    // Add screenshot capture on failure for webPage
    if (expect.getState().currentTestName && expect.getState().assertionCalls === 0 && expect.getState().suppressedErrors.length > 0) {
        const testName = expect.getState().currentTestName.replace(/\s+/g, '-').toLowerCase();
        const screenshotDir = testConfig.screenshotsPath || './screenshots';
        const fs = require('fs');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = `${screenshotDir}/${testName}-contentpage-failure.png`;
        if (webPage && !webPage.isClosed()) {
             await webPage.screenshot({ path: screenshotPath });
             console.log(`Screenshot of content page saved to ${screenshotPath} due to test failure.`);
        }
    }
  });

  // Test Scenario 4: Automatic Content Extraction
  it('should automatically extract content when navigating to a simple article page', async () => {
    await contentPageObjectModel.navigateTo(simpleArticleFixture);

    // How to verify?
    // 1. Check the side panel for extracted content.
    // 2. Check if an API call was made (if auto-extraction also sends to backend).
    // This depends heavily on the extension's behavior.

    // For now, let's assume the extracted title appears in the side panel
    // This requires the SidePanelPage to have a method to get this info.
    // Let's assume a selector like '#nexus-extracted-title' exists in sidepanel.

    // Wait for a short period to allow automatic extraction to occur.
    // Replace this with a more deterministic wait if possible (e.g., waiting for a specific event or element).
    await sidePanelTabPage.waitForTimeout(3000); // Allow time for auto-extraction

    const extractedTextInSidePanel = await sidePanelObjectModel.getExtractedContentText(); // Assuming this method exists and gets relevant data

    expect(extractedTextInSidePanel).not.toBeNull();
    // The exact assertion depends on what `getExtractedContentText` returns and what is extracted.
    // For this example, let's assume it extracts the main H1 and first paragraph.
    expect(extractedTextInSidePanel).toContain('Main Article Title');
    expect(extractedTextInSidePanel).toContain('This is the first paragraph of the article.');
    // We might also want to check that it *doesn't* contain footer text, for example.
    expect(extractedTextInSidePanel).not.toContain('Test Fixtures Inc.');
  });

  // Test Scenario 5: Manual Trigger Extraction
  it('should extract content when manually triggered on a complex layout page', async () => {
    await contentPageObjectModel.navigateTo(complexLayoutFixture);

    // Manually trigger extraction (e.g., by clicking a button in the side panel or a context menu)
    // For this example, let's assume there's a "Extract Content" button in the SidePanel.
    // This requires a method in SidePanelPage like `clickExtractContentButton()`.
    // Let's use a placeholder in SidePanelPage: `this.extractContentButton = '#nexus-extract-content-button';`
    // And add: async clickExtractContentButton() { await this.page.click(this.extractContentButton); }

    // For now, let's assume the click happens on the side panel.
    // Add a temporary method to SidePanelPage for the subtask to use if needed:
    // SidePanelPage.prototype.clickExtractContentButton = async function() {
    //   await this.page.waitForSelector('#nexus-extract-content-button', { visible: true });
    //   await this.page.click('#nexus-extract-content-button');
    // };

    // The actual trigger might be on the content page itself (injected by extension) or side panel.
    // Let's assume it's on the side panel for this example.
    const extractButtonSelector = '#nexus-sidepanel-extract-button'; // Placeholder selector
    try {
        await sidePanelTabPage.waitForSelector(extractButtonSelector, { visible: true, timeout: 5000});
        await sidePanelTabPage.click(extractButtonSelector);
    } catch (e) {
        console.warn(`Could not find or click manual extract button ('${extractButtonSelector}') in side panel. Test might not be meaningful.`);
        // If the button isn't there, this test can't proceed as designed.
        // This highlights the need for actual selectors.
        throw new Error(`Manual extract button '${extractButtonSelector}' not found in side panel. Update selector or test logic.`);
    }


    // Wait for extraction to complete (e.g., status message or content update)
    await sidePanelTabPage.waitForTimeout(2000); // Allow time for manual extraction

    const extractedTextInSidePanel = await sidePanelObjectModel.getExtractedContentText();
    expect(extractedTextInSidePanel).not.toBeNull();
    expect(extractedTextInSidePanel).toContain('Page Title Inside Main Content');
    expect(extractedTextInSidePanel).toContain('This is the main article text that we want to extract.');
    // Check that sidebar content is not included
    expect(extractedTextInSidePanel).not.toContain('Related Links');
    expect(extractedTextInSideLPanel).not.toContain('Some sidebar content that should ideally be ignored.');
  });

  // Add a helper to SidePanelPage for the subtask if it simplifies things,
  // otherwise the subtask can just use waitForSelector and click directly in the test.
});
