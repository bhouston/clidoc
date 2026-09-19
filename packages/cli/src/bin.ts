#!/usr/bin/env node
import { hideBin } from 'yargs/helpers';
import { runCli } from './index.js';

try {
  await runCli(hideBin(process.argv));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
