import { defineConfig } from 'vitest/config';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';

export default defineConfig({
  // This file replaces vite.config.ts under Vitest, so MDX needs its own entry
  // for tests that import lessons (content.test.ts checks they compile).
  plugins: [{ enforce: 'pre', ...mdx({ remarkPlugins: [[remarkGfm, { singleTilde: false }]] }) }],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.{test,itest}.{ts,tsx}'],
    testTimeout: 10_000,
  },
});
