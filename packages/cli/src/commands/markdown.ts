import { readFile } from 'node:fs/promises';
import { parseDocument, renderMarkdown } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
import { output } from '../io.js';

export const command = defineCommand({
  command: 'markdown <input>',
  describe: 'Render an OpenCLI document as Markdown',
  builder: (yargs) =>
    yargs
      .positional('input', { type: 'string', demandOption: true, describe: 'OpenCLI JSON or YAML filename' })
      .option('output', { type: 'string', alias: 'o', describe: 'Output file; defaults to stdout' }),
  handler: async (argv) => {
    await output(renderMarkdown(parseDocument(await readFile(argv.input, 'utf8'))), argv.output);
  },
});
