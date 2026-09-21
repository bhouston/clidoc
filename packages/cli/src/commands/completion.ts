import { readFile } from 'node:fs/promises';
import { generateCompletion, parse, type CompletionShell } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
import { cliDocument } from '../definition.js';
import { output } from '../io.js';

export const command = defineCommand({
  command: 'completion <shell>',
  describe: 'Generate a standalone shell completion script',
  builder: (yargs) =>
    yargs
      .positional('shell', {
        type: 'string',
        choices: ['bash', 'zsh', 'fish'] as const,
        demandOption: true,
        describe: 'Target shell',
      })
      .option('input', { type: 'string', alias: 'i', describe: 'OpenCLI JSON or YAML file; defaults to clidoc itself' })
      .option('binary', { type: 'string', describe: 'Executable name override for completion registration' })
      .option('output', { type: 'string', alias: 'o', describe: 'Output file; defaults to stdout' }),
  handler: async (argv) => {
    const document = argv.input ? parse(await readFile(argv.input, 'utf8')) : cliDocument();
    await output(
      generateCompletion(document, { shell: argv.shell as CompletionShell, binary: argv.binary }),
      argv.output,
    );
  },
});
