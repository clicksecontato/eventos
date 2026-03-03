import { defineConfig, devices } from '@playwright/test';

const usarServidorLocal = process.env.E2E_USE_LOCAL === 'true';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: usarServidorLocal
    ? {
        command: 'npm run dev',
        url: process.env.E2E_BASE_URL || 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
      }
    : undefined,
});
