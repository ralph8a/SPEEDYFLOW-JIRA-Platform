import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 0,
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5000'
  }
});
