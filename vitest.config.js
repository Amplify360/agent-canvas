import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
  resolve: {
    alias: {
      '@/app': resolve(__dirname, './app'),
      '@/server': resolve(__dirname, './server'),
      '@': resolve(__dirname, './app'),
    },
  },
});


