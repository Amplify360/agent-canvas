import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@/app': resolve(__dirname, './app'),
      '@/server': resolve(__dirname, './server'),
      '@': resolve(__dirname, './app'),
    },
  },
});


