import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    actionTimeout: 15000,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    baseURL: 'chrome-extension://[extension-id]/'
  },
  projects: [
    {
      name: 'Chrome',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-extensions-except=./build/chrome-mv3-dev',
            '--load-extension=./build/chrome-mv3-dev'
          ]
        }
      }
    }
  ]
};

export default config; 