import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { name: 'commander', include: ['src/**/*.test.ts'] } });
