import { readFileSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ArgumentsCamelCase } from 'yargs';
import { createDocgenCommand, fromYargs } from '@clidoc/adapter-yargs';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';
import type { OpenCliDocument } from '@clidoc/core';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg, { title: 'Yargs demo', binary: 'demo' });

const greet = {
  command: 'greet <name>',
  describe: 'Greet a person',
  builder: {
    language: {
      alias: 'l',
      type: 'string' as const,
      choices: ['en', 'fr'],
      default: 'en',
      describe: 'Greeting language',
    },
  },
  handler(argv: ArgumentsCamelCase) {
    console.log(`${argv.language === 'fr' ? 'Bonjour' : 'Hello'}, ${argv.name}!`);
  },
};

const parser = yargs(hideBin(process.argv)).command(greet);

let document: OpenCliDocument;
parser.command(createDocgenCommand(() => document)).demandCommand();
// generate the document once every command, including docgen, is registered
document = fromYargs(parser, info);

if (!(await handleOpenCliRequest(hideBin(process.argv), () => document))) {
  parser.parse();
}
