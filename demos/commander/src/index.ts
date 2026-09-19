import { writeFile } from 'node:fs/promises';
import { Command, Option } from 'commander';
import { fromCommander } from '@clidoc/adapter-commander';
import { renderMarkdown } from '@clidoc/core';

const cli = new Command('demo');
cli.description('Commander demo CLI');
cli
  .command('greet <name>')
  .description('Greet a person')
  .addOption(new Option('-l, --language <language>', 'Greeting language').choices(['en', 'fr']).default('en'))
  .action((name: string, options: { language: string }) => {
    console.log(`${options.language === 'fr' ? 'Bonjour' : 'Hello'}, ${name}!`);
  });
cli
  .command('docgen')
  .description('Write the OpenCLI document to a file')
  .requiredOption('--output <file>', 'Output file')
  .addOption(new Option('--format <format>', 'Output format').choices(['json', 'markdown']).default('json'))
  .action(async (options: { output: string; format: 'json' | 'markdown' }) => {
    const generated = document();
    await writeFile(
      options.output,
      options.format === 'markdown' ? renderMarkdown(generated) : `${JSON.stringify(generated, null, 2)}\n`,
    );
  });

const document = () => fromCommander(cli, { title: 'Commander demo', binary: 'demo', version: '0.0.0' });

if (process.argv.slice(2).length === 1 && process.argv[2] === '--opencli') {
  console.log(JSON.stringify(document(), null, 2));
} else {
  cli.parse();
}
