import { writeFile } from 'node:fs/promises';
import { Args, Command, Flags } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';

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
  static override flags = { output: Flags.string({ description: 'Output JSON file', required: true }) };
  async run(): Promise<void> {
    const { flags } = await this.parse(Docgen);
    await writeFile(flags.output, `${JSON.stringify(document(), null, 2)}\n`);
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

if (process.argv.slice(2).length === 1 && process.argv[2] === '--opencli') {
  console.log(JSON.stringify(document(), null, 2));
} else {
  const argv = process.argv.slice(2);
  await (argv[0] === 'docgen' ? Docgen.run(argv.slice(1)) : Greet.run(argv[0] === 'greet' ? argv.slice(1) : argv));
}
