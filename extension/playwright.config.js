// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './__tests__/e2e',
  /* 运行测试的最大失败次数，如果超过则停止 */
  maxFailures: 2,
  /* 每个测试的超时时间，默认为30秒 */
  timeout: 30000,
  /* 测试运行器的超时时间 */
  expect: {
    timeout: 5000
  },
  /* 在测试失败时自动保存截图 */
  use: {
    /* 在测试失败时自动保存追踪和截图 */
    trace: 'on-first-retry',
    /* 录制视频 */
    video: 'on-first-retry',
  },
  /* 配置项目，针对浏览器扩展测试 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* 运行测试的服务器配置，仅在需要本地服务器的情况下使用 */
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  // },
  /* 运行器配置 */
  reporter: [
    ['html', { open: 'never' }], // 生成HTML报告但不自动打开
    ['list']                    // 在控制台中显示测试结果
  ],
}); 