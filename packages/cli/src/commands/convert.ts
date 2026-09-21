import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { convertDocument, DEFAULT_OPENCLI_DIALECT, parseDocument, writeOpenCliDocument } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';

export const command = defineCommand({
  command: 'convert <input>',
  describe: 'Convert between supported OpenCLI dialects; defaults to the preferred bcdxn format',
  builder: (yargs) =>
    yargs
      .positional('input', { type: 'string', demandOption: true, describe: 'OpenCLI JSON or YAML filename' })
      .option('to', {
        type: 'string',
        choices: ['bcdxn', 'opencli-dev'] as const,
        default: DEFAULT_OPENCLI_DIALECT,
        describe: 'Target specification; bcdxn is the preferred default',
      })
      .option('format', {
        type: 'string',
        choices: ['json', 'yaml'] as const,
        default: 'json' as const,
        describe: 'Output serialization format',
      })
      .option('output', { type: 'string', alias: 'o', describe: 'Output file; defaults to stdout' })
      .option('allow-lossy', {
        type: 'boolean',
        default: false,
        describe: 'Allow reported metadata losses; unresolved semantics still fail',
      })
      .option('title', { type: 'string', describe: 'Override the target CLI title' })
      .option('binary', { type: 'string', describe: 'Override the target executable name' })
      .option('cli-version', {
        type: 'string',
        describe: 'Override the described CLI version (not the specification version)',
      }),
  handler: async (argv) => {
    const input = parseDocument(await readFile(argv.input, 'utf8'));
    const result = convertDocument(input, {
      to: argv.to,
      allowLossy: argv['allow-lossy'],
      info: { title: argv.title, binary: argv.binary, version: argv['cli-version'] },
    });
    for (const diagnostic of result.diagnostics)
      process.stderr.write(`Conversion loss ${diagnostic.path}: ${diagnostic.message}\n`);
    if (argv.output) await mkdir(dirname(resolve(argv.output)), { recursive: true });
    await writeOpenCliDocument(result.document, argv.output, argv.format);
  },
});
