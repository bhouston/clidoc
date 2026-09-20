import { readFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import { createDocgenCommand, fromCommander } from '@clidoc/adapter-commander';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg, { title: 'Commander demo', binary: 'demo' });

const cli = new Command('demo');
cli.description('Commander demo CLI');
cli
  .command('greet <name>')
  .description('Greet a person')
  .addOption(new Option('-l, --language <language>', 'Greeting language').choices(['en', 'fr']).default('en'))
  .action((name: string, options: { language: string }) => {
    console.log(`${options.language === 'fr' ? 'Bonjour' : 'Hello'}, ${name}!`);
  });

const document = () => fromCommander(cli, info);
cli.addCommand(createDocgenCommand(document));

if (!handleOpenCliRequest(process.argv.slice(2), document)) {
  cli.parse();
}
