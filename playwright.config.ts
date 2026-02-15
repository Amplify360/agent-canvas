import { defineConfig, devices } from '@playwright/test';

// Use a non-default port so local `next dev` on 3000 doesn't get reused.
const port = Number(process.env.PORT || 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Production-like run: build + start Next, then run Playwright against it.
    command: 'pnpm build && pnpm start',
    port,
    reuseExistingServer: false,
    env: {
      ...process.env,
      E2E_TEST_MODE: '1',
      PORT: String(port),
      // The main app route instantiates Convex client during SSR/prerender.
      // E2E only hits `/e2e`, but `next build` still evaluates `/` unless we
      // provide a value. This keeps CI secret-free and stable.
      NEXT_PUBLIC_CONVEX_URL:
        process.env.NEXT_PUBLIC_CONVEX_URL || 'https://example.invalid',
    },
  },
});
