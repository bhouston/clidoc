import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from '@clidoc/core';
import { fromYargs } from '@clidoc/adapter-yargs';
import { fromCommander } from '@clidoc/adapter-commander';
import { fromOclif } from '@clidoc/adapter-oclif';
import { defineCommand } from 'yargs-file-commands';
import { output } from '../io.js';

export const command = defineCommand({
  command: 'generate <module>',
  describe: 'Import a trusted framework definition module and generate OpenCLI JSON',
  builder: (yargs) =>
    yargs
      .positional('module', {
        type: 'string',
        demandOption: true,
        describe: 'Trusted JS module exporting default metadata and info',
      })
      .option('adapter', {
        type: 'string',
        choices: ['yargs', 'commander', 'oclif'] as const,
        demandOption: true,
        describe: 'Framework adapter',
      })
      .option('output', { type: 'string', alias: 'o', describe: 'Output JSON file; defaults to stdout' }),
  handler: async (argv) => {
    // Importing code is intentional: this command accepts trusted local modules only.
    const source = await import(pathToFileURL(resolve(argv.module)).href);
    if (!source.default || !source.info)
      throw new Error('Module must export default framework metadata and named info');
    const document =
      argv.adapter === 'yargs'
        ? fromYargs(source.default, source.info)
        : argv.adapter === 'commander'
          ? fromCommander(source.default, source.info)
          : fromOclif(source.default, source.info);
    const json = JSON.stringify(document, null, 2) + '\n';
    parse(json);
    await output(json, argv.output);
  },
});
