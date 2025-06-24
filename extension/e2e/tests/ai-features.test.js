beforeEach(async () => {
  // Load a content page first, as AI features likely operate on its content
  webPage = await browser.newPage();
  contentPageObjectModel = new ContentPage(webPage);
  await contentPageObjectModel.navigateTo(simpleArticleFixture); // Load some content

  // Open side panel
  sidePanelTabPage = await extensionHelper.openSidePanel();
  
  // 🔧 设置Mock登录状态 - 这是Chrome扩展测试的最佳实践
  await extensionHelper.mockLoginState({
    email: 'test@example.com',
    token: 'mock-jwtxxx',
    userId: 'test-user-123',
    fullName: 'Test User'
  });
  
  await extensionHelper.waitForExtensionReady(sidePanelTabPage);
  sidePanelObjectModel = new SidePanelPage(sidePanelTabPage, extensionHelper.extensionId);
  loginPage = new LoginPage(sidePanelTabPage);
  await sidePanelObjectModel.waitForLoad();

  // Debug available buttons first
  await sidePanelObjectModel.debugAvailableButtons();

  // Give time for any auto-processes
  await new Promise(resolve => setTimeout(resolve, 2000));
});
