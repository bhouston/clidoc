import { readFileSync } from 'node:fs';
import { Args, Command, Flags } from '@oclif/core';
import { fromOclif } from '@clidoc/adapter-oclif';
import type { OclifManifestCommand } from '@clidoc/adapter-oclif';
import { createDocgenCommand } from '@clidoc/adapter-oclif/docgen';
import { handleOpenCliRequest, infoFromPackageJson } from '@clidoc/core';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const info = infoFromPackageJson(pkg, { title: 'oclif demo', binary: 'demo' });

class Greet extends Command {
  static override description = 'Greet a person';
  static override examples = [
    '<%= config.bin %> greet Ada',
    { command: '<%= config.bin %> greet Ada -l fr', description: 'Greet in French' },
  ];
  static override args = { name: Args.string({ description: 'Person to greet', required: true }) };
  static override flags = {
    language: Flags.string({ char: 'l', options: ['en', 'fr'], default: 'en' }),
    loud: Flags.boolean({ description: 'Shout the greeting', env: 'DEMO_LOUD' }),
  };
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Greet);
    const greeting = `${flags.language === 'fr' ? 'Bonjour' : 'Hello'}, ${args.name}!`;
    this.log(flags.loud ? greeting.toUpperCase() : greeting);
  }
}

function metadata(command: Command.Class): OclifManifestCommand {
  const flags = Object.fromEntries(
    Object.entries(command.flags).map(([name, flag]) => [
      name,
      {
        type: flag.type,
        char: flag.char,
        description: flag.description,
        options: 'options' in flag ? flag.options : undefined,
        required: flag.required,
        default: typeof flag.default === 'function' ? undefined : flag.default,
        env: flag.env,
        helpValue: 'helpValue' in flag ? flag.helpValue : undefined,
        multiple: 'multiple' in flag ? flag.multiple : undefined,
      },
    ]),
  );
  const args = Object.fromEntries(
    Object.entries(command.args).map(([name, arg]) => [
      name,
      {
        description: arg.description,
        required: arg.required,
        default: typeof arg.default === 'function' ? undefined : arg.default,
      },
    ]),
  );
  return { description: command.description, examples: command.examples, args, flags };
}

// Real oclif projects generate this manifest at build time (`oclif manifest`); this demo builds
// it inline to stay a single file.
const document = () => fromOclif(manifest, info);
const Docgen = createDocgenCommand(() => ({ manifest, info }));
const manifest = { commands: { greet: metadata(Greet), docgen: metadata(Docgen) } };

if (!handleOpenCliRequest(process.argv.slice(2), document)) {
  const argv = process.argv.slice(2);
  await (argv[0] === 'docgen' ? Docgen.run(argv.slice(1)) : Greet.run(argv[0] === 'greet' ? argv.slice(1) : argv));
}
