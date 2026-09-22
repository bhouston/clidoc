import { createRequire } from 'node:module';
import { fromYargs } from '@clidoc/adapter-yargs';
import { command as completion } from './commands/completion.js';
import { command as docgen } from './commands/docgen.js';
import { command as mcp } from './commands/mcp.js';
import { command as markdown } from './commands/markdown.js';
import { command as validate } from './commands/validate.js';

const packageJson = createRequire(import.meta.url)('../package.json') as { version: string };

export const info = {
  title: 'clidoc',
  binary: 'clidoc',
  version: packageJson.version,
  summary: 'Generate, validate, and publish CLI documentation through OpenCLI.',
};
export const commands = [markdown, validate, docgen, completion, mcp];
/** Documentation and runtime share the exact same command definitions. */
export function cliDocument() {
  const document = fromYargs(commands, info);
  document.global = {
    flags: [
      { name: 'help', type: 'boolean', summary: 'Show help' },
      { name: 'version', type: 'boolean', summary: 'Show version number' },
    ],
  };
  return document;
}
