import { fromYargs } from '@clidoc/adapter-yargs';
import { command as generate } from './commands/generate.js';
import { command as markdown } from './commands/markdown.js';
import { command as validate } from './commands/validate.js';

export const info = {
  title: 'clidoc',
  binary: 'clidoc',
  version: '0.1.0',
  summary: 'Generate, validate, and publish CLI documentation through OpenCLI.',
};
export const commands = [generate, markdown, validate];
/** Documentation and runtime share the exact same command definitions. */
export function cliDocument() {
  return fromYargs(commands, info);
}
