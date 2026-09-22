import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { name: 'oclif', include: ['src/**/*.test.ts'] } });
