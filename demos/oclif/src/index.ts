import { writeFile } from 'node:fs/promises';
import { Args, Command, Flags } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';
import { handleOpenCliRequest, renderMarkdown } from '@clidoc/core';

class Greet extends Command {
  static override description = 'Greet a person';
  static override args = { name: Args.string({ description: 'Person to greet', required: true }) };
  static override flags = { language: Flags.string({ char: 'l', options: ['en', 'fr'], default: 'en' }) };
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Greet);
    this.log(`${flags.language === 'fr' ? 'Bonjour' : 'Hello'}, ${args.name}!`);
  }
}

class Docgen extends Command {
  static override description = 'Write the OpenCLI document to a file';
  static override flags = {
    output: Flags.string({ description: 'Output file', required: true }),
    format: Flags.string({ description: 'Output format', options: ['json', 'markdown'], default: 'json' }),
  };
  async run(): Promise<void> {
    const { flags } = await this.parse(Docgen);
    const generated = document();
    await writeFile(
      flags.output,
      flags.format === 'markdown' ? renderMarkdown(generated) : `${JSON.stringify(generated, null, 2)}\n`,
    );
  }
}

function metadata(command: typeof Greet | typeof Docgen) {
  const flags = Object.fromEntries(
    Object.entries(command.flags).map(([name, flag]) => [
      name,
      {
        char: flag.char,
        description: flag.description,
        options: flag.options,
        required: flag.required,
        default: typeof flag.default === 'function' ? undefined : flag.default,
      },
    ]),
  );
  return { description: command.description, args: command === Greet ? Greet.args : {}, flags };
}

const document = () =>
  fromOclif(
    { commands: { greet: metadata(Greet), docgen: metadata(Docgen) } },
    { title: 'oclif demo', binary: 'demo', version: '0.0.0' },
  );

if (!handleOpenCliRequest(process.argv.slice(2), document)) {
  const argv = process.argv.slice(2);
  await (argv[0] === 'docgen' ? Docgen.run(argv.slice(1)) : Greet.run(argv[0] === 'greet' ? argv.slice(1) : argv));
}
