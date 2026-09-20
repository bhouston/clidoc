import { writeOpenCliDocument } from '@clidoc/core';
import type { DocumentFormat } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
import { cliDocument } from '../definition.js';

export const command = defineCommand({
  command: 'docgen',
  describe: 'Write clidoc’s own OpenCLI document',
  builder: (yargs) =>
    yargs
      .option('format', {
        type: 'string',
        choices: ['json', 'yaml', 'markdown'] as const,
        default: 'json',
        describe: 'Output format',
      })
      .option('output', { type: 'string', alias: 'o', describe: 'Output file; defaults to stdout' }),
  handler: async (argv) => {
    await writeOpenCliDocument(cliDocument(), argv.output, argv.format as DocumentFormat);
  },
});
