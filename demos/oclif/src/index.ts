import { Args, Command, Flags } from '@oclif/core';
import { fromOclif } from '@opencli/adapter-oclif';

class Greet extends Command {
  static override description = 'Greet a person';
  static override args = { name: Args.string({ description: 'Person to greet', required: true }) };
  static override flags = { language: Flags.string({ char: 'l', options: ['en', 'fr'], default: 'en' }) };
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Greet);
    this.log(`${flags.language === 'fr' ? 'Bonjour' : 'Hello'}, ${args.name}!`);
  }
}

if (process.argv.includes('--opencli')) {
  const flags = Object.fromEntries(
    Object.entries(Greet.flags).map(([name, flag]) => [
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
  const manifest = { commands: { greet: { description: Greet.description, args: Greet.args, flags } } };
  console.log(JSON.stringify(fromOclif(manifest, { title: 'oclif demo', binary: 'demo', version: '0.0.0' }), null, 2));
} else {
  await Greet.run(process.argv.slice(2));
}
