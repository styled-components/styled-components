import { defineConfig, devices } from '@playwright/test';

const PORT = 3016;

export default defineConfig({
  expect: { timeout: 20_000 },
  forbidOnly: true,
  fullyParallel: true,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  testDir: './e2e',
  timeout: 90_000,
  use: { baseURL: `http://sc-e2e.localhost:${PORT}` },
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    timeout: 300_000,
    url: `http://sc-e2e.localhost:${PORT}/scenarios`,
  },
});
