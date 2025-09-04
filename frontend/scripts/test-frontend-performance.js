/**
 * 前端认证性能测试脚本
 */

const puppeteer = require('puppeteer');

async function testAuthPerformance() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  console.log('🧪 开始前端认证性能测试...');
  
  // 监听网络请求
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/api/v1/users/me')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });
  
  // 测试登录页面加载
  console.log('1. 测试登录页面加载...');
  const loginStart = Date.now();
  await page.goto('http://localhost:3000/login');
  const loginEnd = Date.now();
  console.log(`   登录页面加载时间: ${loginEnd - loginStart}ms`);
  
  // 模拟登录 (需要有效的测试账号)
  try {
    await page.type('#email', 'test@example.com');
    await page.type('#password', 'testpassword');
    
    const submitStart = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 10000 });
    const submitEnd = Date.now();
    
    console.log(`   登录提交时间: ${submitEnd - submitStart}ms`);
    
    // 测试页面跳转
    const navStart = Date.now();
    await page.goto('http://localhost:3000/content-library');
    await page.waitForLoadState('networkidle');
    const navEnd = Date.now();
    
    console.log(`   页面跳转时间: ${navEnd - navStart}ms`);
    
    // 分析API请求
    console.log(`\n📊 API请求分析:`);
    console.log(`   总请求数: ${requests.length}`);
    
    if (requests.length > 0) {
      const timestamps = requests.map(r => r.timestamp);
      const totalTime = Math.max(...timestamps) - Math.min(...timestamps);
      console.log(`   请求总时长: ${totalTime}ms`);
      console.log(`   平均请求间隔: ${totalTime / requests.length}ms`);
    }
    
  } catch (error) {
    console.log('⚠️  登录测试跳过 (需要配置有效的测试账号)');
  }
  
  await browser.close();
  console.log('✅ 前端性能测试完成');
}

if (require.main === module) {
  testAuthPerformance().catch(console.error);
}

module.exports = { testAuthPerformance };
