import { readFileSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ArgumentsCamelCase, CommandModule } from 'yargs';
import { createDocgenCommand, fromYargs } from '@clidoc/adapter-yargs';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';

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

const document = () => fromYargs([greet, docgen], info);
const docgen = createDocgenCommand(document);

if (!(await handleOpenCliRequest(hideBin(process.argv), document))) {
  // createDocgenCommand()'s return type is structural (no yargs dependency in @clidoc/adapter-yargs);
  // it matches yargs's own CommandModule shape at runtime.
  yargs(hideBin(process.argv))
    .command(greet)
    .command(docgen as CommandModule)
    .demandCommand()
    .parse();
}
