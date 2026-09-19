import { writeFile } from 'node:fs/promises';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ArgumentsCamelCase } from 'yargs';
import { fromYargs } from '@clidoc/adapter-yargs';

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

const docgen = {
  command: 'docgen',
  describe: 'Write the OpenCLI document to a file',
  builder: { output: { type: 'string' as const, demandOption: true, describe: 'Output JSON file' } },
  async handler(argv: ArgumentsCamelCase<{ output: string }>) {
    await writeFile(argv.output, `${JSON.stringify(document(), null, 2)}\n`);
  },
};

const document = () => fromYargs([greet, docgen], { title: 'Yargs demo', binary: 'demo', version: '0.0.0' });

if (process.argv.slice(2).length === 1 && process.argv[2] === '--opencli') {
  console.log(JSON.stringify(document(), null, 2));
} else {
  yargs(hideBin(process.argv)).command(greet).command(docgen).demandCommand().parse();
}
