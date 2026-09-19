import { readFile } from 'node:fs/promises';
import { parse } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';

export const command = defineCommand({
  command: 'validate <input>',
  describe: 'Validate an OpenCLI JSON or YAML document',
  builder: (yargs) =>
    yargs.positional('input', {
      type: 'string',
      demandOption: true,
      describe: 'OpenCLI document filename',
    }),
  handler: async ({ input }) => {
    parse(await readFile(input, 'utf8'));
    process.stdout.write('Valid OpenCLI document\n');
  },
});
