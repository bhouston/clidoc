#!/usr/bin/env node
import { hideBin } from 'yargs/helpers';
import { handleOpenCliRequest } from '@clidoc/core';
import { cliDocument, runCli } from './index.js';

try {
  const argv = hideBin(process.argv);
  if (!handleOpenCliRequest(argv, cliDocument)) await runCli(argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
