import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    name: 'docusaurus',
    include: ['src/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/index.ts'] },
  },
});
