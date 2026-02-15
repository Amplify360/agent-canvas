import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Keep Vitest scoped to our unit/integration tests.
    // Playwright E2E tests live under `tests/e2e` and use `*.spec.ts`.
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@/app': resolve(__dirname, './app'),
      '@/server': resolve(__dirname, './server'),
      '@': resolve(__dirname, './app'),
    },
  },
});
