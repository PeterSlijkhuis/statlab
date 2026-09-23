import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkGfm from 'remark-gfm';

export default defineConfig({
  base: '/statlab/',
  plugins: [
    // GFM for the tables in lessons. Single tildes stay plain text: R formulas
    // such as y ~ x appear in prose, and two of them would strike out the words between.
    { enforce: 'pre', ...mdx({ remarkPlugins: [[remarkGfm, { singleTilde: false }]] }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  ],
});
