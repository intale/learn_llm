import { defineConfig } from '@playwright/test';

export const E2E_PREVIEW_PORT = 64_173;
export const E2E_PREVIEW_ORIGIN = `http://127.0.0.1:${E2E_PREVIEW_PORT}`;

const config = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: E2E_PREVIEW_ORIGIN,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${E2E_PREVIEW_PORT}`,
    url: `${E2E_PREVIEW_ORIGIN}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});

export default config;
