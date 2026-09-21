import { readFile } from 'node:fs/promises';
import { parse } from '@clidoc/core';
import { defineCommand } from 'yargs-file-commands';
import { compileMcpTools, serveMcp } from '../mcp/index.js';
import { output } from '../io.js';

export const command = defineCommand({
  command: 'mcp <input>',
  describe: 'Export MCP tools or serve a trusted CLI over MCP stdio',
  builder: (yargs) =>
    yargs
      .positional('input', { type: 'string', demandOption: true, describe: 'OpenCLI JSON or YAML filename' })
      .option('output', { type: 'string', alias: 'o', describe: 'Tool catalog output file; defaults to stdout' })
      .option('serve', { type: 'boolean', default: false, describe: 'Serve MCP over stdin/stdout' })
      .option('executable', { type: 'string', describe: 'Trusted executable to run; required with --serve' })
      .option('cwd', { type: 'string', describe: 'Working directory for CLI invocations' })
      .option('timeout-ms', { type: 'number', describe: 'Invocation timeout in milliseconds (default: 30000)' })
      .option('max-output-bytes', { type: 'number', describe: 'Combined stdout/stderr limit (default: 1048576)' }),
  handler: async (argv) => {
    if (argv.serve && argv.output) throw new Error('--output cannot be used with --serve');
    if (argv.serve && !argv.executable) throw new Error('--serve requires --executable');
    if (
      !argv.serve &&
      [argv.executable, argv.cwd, argv.timeoutMs, argv.maxOutputBytes].some((value) => value !== undefined)
    )
      throw new Error('Execution options require --serve');
    const document = parse(await readFile(argv.input, 'utf8'));
    if (argv.serve) {
      await serveMcp(document, {
        executable: argv.executable!,
        cwd: argv.cwd,
        timeoutMs: argv.timeoutMs,
        maxOutputBytes: argv.maxOutputBytes,
      });
    } else {
      await output(
        JSON.stringify({ tools: compileMcpTools(document).map((entry) => entry.tool) }, null, 2) + '\n',
        argv.output,
      );
    }
  },
});
