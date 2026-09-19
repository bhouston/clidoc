import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ArgumentsCamelCase } from 'yargs';
import { fromYargs } from '@opencli/adapter-yargs';

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

if (process.argv.includes('--opencli')) {
  console.log(JSON.stringify(fromYargs([greet], { title: 'Yargs demo', binary: 'demo', version: '0.0.0' }), null, 2));
} else {
  yargs(hideBin(process.argv)).command(greet).demandCommand().parse();
}
