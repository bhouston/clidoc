import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium' },
  webServer: {
    command: 'pnpm exec docusaurus serve --host 127.0.0.1 --port 4173 --no-open',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
