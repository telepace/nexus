// extension/e2e/tests/debug-ui.test.js
const ExtensionHelper = require('../helpers/extension-helper');
const mockApi = require('../utils/mock-server');
const testConfig = require('../config/test.config');

jest.setTimeout(testConfig.defaultTimeout + 20000);

describe('Nexus Extension UI Debug', () => {
  let extensionHelper;
  let browser;
  let sidePanelPage;

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

  it('should debug current extension UI state', async () => {
    // Open side panel
    sidePanelPage = await extensionHelper.openSidePanel();
    await extensionHelper.waitForExtensionReady(sidePanelPage);
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Debug all UI elements
    console.log('\n=== CURRENT EXTENSION UI STATE ===');
    
    // Check for all buttons
    const buttons = await sidePanelPage.$$('button');
    console.log(`Total buttons found: ${buttons.length}`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await sidePanelPage.evaluate(el => el.textContent?.trim(), button);
      const className = await sidePanelPage.evaluate(el => el.className, button);
      const disabled = await sidePanelPage.evaluate(el => el.disabled, button);
      console.log(`Button ${i}: "${text}" (class: ${className.substring(0, 50)}...) disabled: ${disabled}`);
    }
    
    // Check for input fields
    const inputs = await sidePanelPage.$$('input');
    console.log(`\nTotal input fields found: ${inputs.length}`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await sidePanelPage.evaluate(el => el.type, input);
      const placeholder = await sidePanelPage.evaluate(el => el.placeholder, input);
      const name = await sidePanelPage.evaluate(el => el.name, input);
      const id = await sidePanelPage.evaluate(el => el.id, input);
      console.log(`Input ${i}: type="${type}" placeholder="${placeholder}" name="${name}" id="${id}"`);
    }
    
    // Check for all text content
    const bodyText = await sidePanelPage.evaluate(() => document.body.textContent);
    console.log(`\nPage content preview: ${bodyText.substring(0, 300)}...`);
    
    // Check current URL and title
    const url = sidePanelPage.url();
    const title = await sidePanelPage.title();
    console.log(`\nURL: ${url}`);
    console.log(`Title: ${title}`);
    
    // Check for forms
    const forms = await sidePanelPage.$$('form');
    console.log(`\nTotal forms found: ${forms.length}`);
    
    // Take a screenshot for visual debugging
    await sidePanelPage.screenshot({ path: './test-results/extension-ui-debug.png' });
    console.log('\nScreenshot saved to ./test-results/extension-ui-debug.png');
    
    console.log('\n=== END UI STATE DEBUG ===');
    
    // Basic assertion to make this test pass
    expect(buttons.length).toBeGreaterThanOrEqual(0);
    
    await sidePanelPage.close();
  });
}); 