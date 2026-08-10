import { defineConfig } from '@playwright/test';

export const E2E_PREVIEW_PORT = 64_173;
export const E2E_PREVIEW_ORIGIN = `http://127.0.0.1:${E2E_PREVIEW_PORT}`;
export const E2E_PROXY_PORT = 64_174;
export const E2E_PROXY_ORIGIN = `http://127.0.0.1:${E2E_PROXY_PORT}`;

const config = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  projects: [
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
  ],
  use: {
    baseURL: E2E_PREVIEW_ORIGIN,
    javaScriptEnabled: true,
    proxy: {
      server: E2E_PROXY_ORIGIN,
      bypass: '127.0.0.1',
    },
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: `npm run preview -- --host 127.0.0.1 --port ${E2E_PREVIEW_PORT}`,
      url: `${E2E_PREVIEW_ORIGIN}/`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `node tests/e2e/block-external-proxy.mjs --host 127.0.0.1 --port ${E2E_PROXY_PORT}`,
      url: `${E2E_PROXY_ORIGIN}/ready`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});

export default config;
