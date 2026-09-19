import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { name: 'adapter-oclif', include: ['src/**/*.test.ts'] } });
