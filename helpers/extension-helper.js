async launchBrowser() {
  const extensionPath = path.resolve(process.cwd(), testConfig.extensionBuildPath);
  console.log(`Attempting to load extension from: ${extensionPath}`);

  // 过滤掉不完整的args并添加extension路径
  const baseArgs = puppeteerConfig.args.filter(arg => 
    arg !== '--disable-extensions-except' && arg !== '--load-extension'
  );
  
  const args = [
    ...baseArgs,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];

  console.log('Puppeteer args:', args);
  
  this.browser = await puppeteer.launch({ 
    ...puppeteerConfig, 
    args,
    // 强制设置为非headless模式进行调试
    headless: false
  });
  
  // Wait longer for extension to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return this.browser;
} 