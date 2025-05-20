import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 5 * 60 * 1000,
  reporter: 'html',
  
  use: {
    baseURL: 'chrome-extension://',
    trace: 'on-first-retry',
    headless: false,
    launchOptions: {
      slowMo: 100,
      timeout: 5 * 60 * 1000,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.join(__dirname)}`,
            `--load-extension=${path.join(__dirname)}`,
            '--no-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    port: 1815,
    reuseExistingServer: !process.env.CI,
    timeout: 5 * 60 * 1000,
  },
}); 