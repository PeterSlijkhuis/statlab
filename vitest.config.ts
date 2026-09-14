import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.{test,itest}.{ts,tsx}'],
    testTimeout: 10_000,
  },
});
