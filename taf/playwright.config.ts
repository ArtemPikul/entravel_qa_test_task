import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(import.meta.dirname, '.env'), quiet: true });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const reportDirectory = './playwright-reports';

export default defineConfig({
  testDir: './tests/specs',
  testMatch: ['**/ui/**/*.spec.ts', '**/api/**/*.spec.ts'],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { outputFolder: `${reportDirectory}/html-report`, open: 'never' }],
    ['list'],
  ],

  outputDir: `${reportDirectory}/artifacts`,

  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'ui-tests',
      testMatch: '**/ui/**/*.spec.ts',
      use: {
        baseURL: BASE_URL,
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
        screenshot: { mode: 'only-on-failure', fullPage: true },
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'api-tests',
      testMatch: '**/api/**/*.spec.ts',
      use: {
        baseURL: BASE_URL,
        extraHTTPHeaders: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        ignoreHTTPSErrors: true,
      },
    },
  ],
});
