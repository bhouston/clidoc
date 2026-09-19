import { createRequire } from 'node:module';
import { fromYargs } from '@clidoc/adapter-yargs';
import { command as docgen } from './commands/docgen.js';
import { command as generate } from './commands/generate.js';
import { command as markdown } from './commands/markdown.js';
import { command as validate } from './commands/validate.js';

const packageJson = createRequire(import.meta.url)('../package.json') as { version: string };

export const info = {
  title: 'clidoc',
  binary: 'clidoc',
  version: packageJson.version,
  summary: 'Generate, validate, and publish CLI documentation through OpenCLI.',
};
export const commands = [generate, markdown, validate, docgen];
/** Documentation and runtime share the exact same command definitions. */
export function cliDocument() {
  return fromYargs(commands, info);
}
