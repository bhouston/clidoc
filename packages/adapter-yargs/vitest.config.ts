import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { name: 'adapter-yargs', include: ['src/**/*.test.ts'] } });
