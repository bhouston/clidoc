import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'demos/*'],
    exclude: ['**/*.browser.test.js'],
    coverage: {
      provider: 'v8',
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
});
