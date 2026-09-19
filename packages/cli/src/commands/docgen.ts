import { renderMarkdown } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
import { cliDocument } from '../definition.js';
import { output } from '../io.js';

export const command = defineCommand({
  command: 'docgen',
  describe: 'Write clidoc’s own OpenCLI document',
  builder: (yargs) =>
    yargs
      .option('format', {
        type: 'string',
        choices: ['json', 'markdown'] as const,
        default: 'json',
        describe: 'Output format',
      })
      .option('output', { type: 'string', alias: 'o', describe: 'Output file; defaults to stdout' }),
  handler: async (argv) => {
    const document = cliDocument();
    const content = argv.format === 'markdown' ? renderMarkdown(document) : `${JSON.stringify(document, null, 2)}\n`;
    await output(content, argv.output);
  },
});
