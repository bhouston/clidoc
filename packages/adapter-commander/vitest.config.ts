import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { name: 'adapter-commander', include: ['src/**/*.test.ts'] } });
