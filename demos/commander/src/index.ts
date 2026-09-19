import { Command, Option } from 'commander';
import { fromCommander } from '@clidoc/adapter-commander';

const cli = new Command('demo');
cli.description('Commander demo CLI');
cli
  .command('greet <name>')
  .description('Greet a person')
  .addOption(new Option('-l, --language <language>', 'Greeting language').choices(['en', 'fr']).default('en'))
  .action((name: string, options: { language: string }) => {
    console.log(`${options.language === 'fr' ? 'Bonjour' : 'Hello'}, ${name}!`);
  });
if (process.argv.slice(2).length === 1 && process.argv[2] === '--opencli') {
  console.log(
    JSON.stringify(fromCommander(cli, { title: 'Commander demo', binary: 'demo', version: '0.0.0' }), null, 2),
  );
} else {
  cli.parse();
}
